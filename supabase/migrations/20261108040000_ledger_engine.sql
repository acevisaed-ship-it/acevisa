-- Ledger engine: all business logic lives in the database so very little app code is needed.
--  * ledger_rate / ledger_reconcile  : incentive maths (milestone split, own rate, shares, clearance, refunds, clawbacks)
--  * triggers                        : payments, expenses, refunds, milestones, shares, clearance, case status keep incentives correct automatically
--  * ledger_action(...)              : one dispatcher for vouchers, refunds, holds, shares, stages, visit visa, checklists,
--                                      attestation, services, language tests, sessions, advances, commission plans, payroll
--  * payroll_build / payroll_set_status
--  * v_*_wide views                  : read models for registers, dashboards and the query API
-- Apply AFTER 20261107*, 20261108000000, 20261108010000, 20261108020000, 20261108030000.
-- Apply with: npx.cmd supabase db query --linked --file supabase/migrations/20261108040000_ledger_engine.sql   (never `db push`)

ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);
UPDATE deals d SET product_id = (
  SELECT i.product_id FROM invoices i WHERE i.deal_id = d.id AND i.product_id IS NOT NULL AND i.deleted_at IS NULL
  ORDER BY i.created_at ASC LIMIT 1)
WHERE d.product_id IS NULL;

-- ---------------------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION ledger_audit(p_actor uuid, p_role text, p_type text, p_id uuid, p_action text,
                                        p_before jsonb, p_after jsonb, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO audit_events (actor_id, actor_role, entity_type, entity_id, action, before_data, after_data, reason)
  VALUES (p_actor, p_role, p_type, p_id, p_action, p_before, p_after, p_reason);
$$;

CREATE OR REPLACE FUNCTION la_assert_client(p_client uuid, p_branch uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_branch IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client AND branch_id = p_branch) THEN
    RAISE EXCEPTION 'Not in your branch';
  END IF;
END $$;

-- Counselor's own rate: commission_plans (percent or tier) -> product rule -> commission_rules -> counselors.commission_rate
CREATE OR REPLACE FUNCTION ledger_rate(p_counselor uuid, p_product uuid, p_gross numeric, p_on date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE pl commission_plans%ROWTYPE; r numeric; found_rule boolean;
BEGIN
  SELECT * INTO pl FROM commission_plans cp
   WHERE cp.counselor_id = p_counselor AND (cp.product_id = p_product OR cp.product_id IS NULL)
     AND cp.effective_from <= p_on AND (cp.effective_to IS NULL OR cp.effective_to >= p_on)
   ORDER BY (cp.product_id IS NULL), cp.effective_from DESC LIMIT 1;
  IF FOUND THEN
    IF pl.plan_type = 'percent' THEN RETURN pl.rate; END IF;
    SELECT t.rate INTO r FROM commission_plan_tiers t
     WHERE t.plan_id = pl.id AND p_gross >= t.min_gross AND (t.max_gross IS NULL OR p_gross < t.max_gross)
     ORDER BY t.min_gross DESC LIMIT 1;
    IF FOUND THEN RETURN r; END IF;
  END IF;

  IF p_product IS NOT NULL THEN
    SELECT commission_value INTO r FROM product_commission_rules
     WHERE product_id = p_product AND counselor_id = p_counselor AND commission_type = 'percentage' LIMIT 1;
    IF FOUND THEN RETURN r; END IF;
    SELECT commission_value INTO r FROM product_commission_rules
     WHERE product_id = p_product AND counselor_id IS NULL AND role = 'counselor' AND commission_type = 'percentage' LIMIT 1;
    IF FOUND THEN RETURN r; END IF;
  END IF;

  SELECT commission_rate INTO r FROM commission_rules WHERE counselor_id = p_counselor LIMIT 1;
  IF FOUND AND r IS NOT NULL THEN RETURN r; END IF;
  SELECT commission_rate INTO r FROM counselors WHERE id = p_counselor;
  RETURN COALESCE(r, 0);
END $$;

-- ---------------------------------------------------------------- incentive reconcile
-- Makes the stored incentive rows match the current truth for one case. Never edits amounts in place:
-- changes are a reversing row (negative, status reversed) plus a new row. Paid rows are never reissued:
-- a shortfall becomes a payout_adjustments clawback (or credit) for the next payroll.
CREATE OR REPLACE FUNCTION ledger_reconcile(p_deal uuid, p_strict boolean DEFAULT false, p_actor uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  d deals%ROWTYPE; v_prod uuid; v_gross numeric; v_clr case_clearance%ROWTYPE; v_cleared boolean := false;
  v_status text; v_period date; v_paydate date; v_changed integer := 0;
  tgt record; live incentives%ROWTYPE; v_found boolean; v_base numeric; v_rate numeric; v_amt numeric;
  v_tstatus text; v_sum numeric; v_missing text; v_already numeric; v_delta numeric; v_keys text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO d FROM deals WHERE id = p_deal;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_prod := COALESCE(d.product_id, (SELECT i.product_id FROM invoices i
              WHERE i.deal_id = p_deal AND i.product_id IS NOT NULL AND i.deleted_at IS NULL
              ORDER BY i.created_at DESC LIMIT 1));

  IF NOT EXISTS (SELECT 1 FROM milestones WHERE deal_id = p_deal) AND NOT EXISTS (SELECT 1 FROM incentives WHERE deal_id = p_deal) THEN
    RETURN 0;
  END IF;

  v_gross := COALESCE((SELECT sum(amount) FROM payments WHERE deal_id = p_deal AND COALESCE(status, 'recorded') = 'recorded'), 0)
           - COALESCE((SELECT sum(amount) FROM refunds WHERE deal_id = p_deal AND status = 'paid'), 0)
           - COALESCE((SELECT sum(amount) FROM expenses WHERE deal_id = p_deal AND deleted_at IS NULL AND reduce_gross), 0);
  v_gross := GREATEST(v_gross, 0);

  SELECT * INTO v_clr FROM case_clearance WHERE deal_id = p_deal ORDER BY created_at DESC LIMIT 1;
  IF FOUND AND v_clr.status = 'cleared' THEN
    v_cleared := true;
    v_status := 'active';
    v_period := date_trunc('month', v_clr.cleared_at AT TIME ZONE 'Asia/Karachi')::date;
    v_paydate := (v_period + interval '1 month' + interval '9 days')::date;
  ELSE
    v_status := 'pending_clearance';
  END IF;

  SELECT COALESCE(sum(share_pct), 0) INTO v_sum FROM case_counselor_shares
   WHERE deal_id = p_deal AND status = 'approved' AND effective_to IS NULL;
  IF v_sum > 0 AND abs(v_sum - 100) > 0.001 THEN
    IF p_strict THEN RAISE EXCEPTION 'Approved shares must sum to 100 (got %)', v_sum; END IF;
    RETURN 0;
  END IF;

  IF p_strict THEN
    SELECT string_agg(DISTINCT m.type, ', ') INTO v_missing FROM milestones m
     WHERE m.deal_id = p_deal
       AND NOT EXISTS (SELECT 1 FROM product_milestone_shares ps WHERE ps.product_id = v_prod AND ps.milestone_type = m.type);
    IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'No milestone percentage set for: %', v_missing; END IF;
  END IF;

  FOR tgt IN
    SELECT m.id AS milestone_id, h.counselor_id, h.share_pct, ps.share_pct AS ms_pct
      FROM milestones m
      JOIN product_milestone_shares ps ON ps.product_id = v_prod AND ps.milestone_type = m.type
      CROSS JOIN LATERAL (
        SELECT s.counselor_id, s.share_pct FROM case_counselor_shares s
         WHERE s.deal_id = p_deal AND s.status = 'approved' AND s.effective_to IS NULL
        UNION ALL
        SELECT m.holder_counselor_id, 100::numeric
         WHERE m.holder_counselor_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM case_counselor_shares s2
                            WHERE s2.deal_id = p_deal AND s2.status = 'approved' AND s2.effective_to IS NULL)
      ) h
     WHERE m.deal_id = p_deal
  LOOP
    v_keys := v_keys || (tgt.milestone_id::text || ':' || tgt.counselor_id::text);
    v_base := round(v_gross * tgt.ms_pct / 100, 2);

    SELECT * INTO live FROM incentives
     WHERE deal_id = p_deal AND milestone_id = tgt.milestone_id AND counselor_id = tgt.counselor_id
       AND status IN ('pending_clearance', 'active', 'held', 'paid')
     ORDER BY created_at DESC LIMIT 1;
    v_found := FOUND;

    IF v_found THEN v_rate := live.rate_snapshot;
    ELSE v_rate := ledger_rate(tgt.counselor_id, v_prod, v_gross, CURRENT_DATE);
    END IF;
    v_amt := round(v_base * tgt.share_pct / 100 * v_rate / 100, 2);

    IF NOT v_found THEN
      IF v_amt > 0 THEN
        INSERT INTO incentives (deal_id, client_id, counselor_id, product_id, milestone_id, clearance_id, gross_base, milestone_pct,
                                share_pct, rate_snapshot, amount, status, payable_period, pay_date, created_by)
        VALUES (p_deal, d.client_id, tgt.counselor_id, v_prod, tgt.milestone_id, CASE WHEN v_cleared THEN v_clr.id END,
                v_base, tgt.ms_pct, tgt.share_pct, v_rate, v_amt, v_status,
                CASE WHEN v_cleared THEN v_period END, CASE WHEN v_cleared THEN v_paydate END, p_actor);
        v_changed := v_changed + 1;
      END IF;

    ELSIF live.status = 'paid' THEN
      SELECT COALESCE(sum(amount), 0) INTO v_already FROM payout_adjustments
       WHERE incentive_id = live.id AND status <> 'cancelled' AND kind IN ('clawback', 'correction');
      v_delta := (live.amount - v_amt) - v_already;
      IF abs(v_delta) > 0.004 THEN
        INSERT INTO payout_adjustments (counselor_id, incentive_id, kind, amount, reason)
        VALUES (live.counselor_id, live.id, CASE WHEN v_delta > 0 THEN 'clawback' ELSE 'correction' END, v_delta,
                'Case gross changed after payout (refund or expense)');
        v_changed := v_changed + 1;
      END IF;

    ELSE
      v_tstatus := CASE WHEN live.status = 'held' THEN 'held' ELSE v_status END;
      IF live.amount <> v_amt OR live.share_pct <> tgt.share_pct OR live.gross_base <> v_base OR live.status <> v_tstatus
         OR (v_tstatus = 'active' AND live.payable_period IS DISTINCT FROM v_period) THEN
        INSERT INTO incentives (deal_id, client_id, counselor_id, product_id, milestone_id, clearance_id, gross_base, milestone_pct,
                                share_pct, rate_snapshot, amount, status, reverses_id, created_by)
        VALUES (live.deal_id, live.client_id, live.counselor_id, live.product_id, live.milestone_id, live.clearance_id,
                live.gross_base, live.milestone_pct, live.share_pct, live.rate_snapshot, -live.amount, 'reversed', live.id, p_actor);
        UPDATE incentives SET status = 'reversed' WHERE id = live.id;
        INSERT INTO incentives (deal_id, client_id, counselor_id, product_id, milestone_id, clearance_id, gross_base, milestone_pct,
                                share_pct, rate_snapshot, amount, status, hold_reason, payable_period, pay_date, created_by)
        VALUES (live.deal_id, live.client_id, live.counselor_id, v_prod, live.milestone_id, CASE WHEN v_cleared THEN v_clr.id END,
                v_base, tgt.ms_pct, tgt.share_pct, v_rate, v_amt, v_tstatus, live.hold_reason,
                CASE WHEN v_tstatus IN ('active', 'held') AND v_cleared THEN v_period END,
                CASE WHEN v_tstatus IN ('active', 'held') AND v_cleared THEN v_paydate END, p_actor);
        v_changed := v_changed + 1;
      END IF;
    END IF;
  END LOOP;

  -- rows whose milestone/holder is no longer a target (e.g. shares changed): reverse them
  FOR live IN SELECT * FROM incentives
               WHERE deal_id = p_deal AND status IN ('pending_clearance', 'active', 'held')
                 AND milestone_id IS NOT NULL
                 AND NOT ((milestone_id::text || ':' || counselor_id::text) = ANY (v_keys))
  LOOP
    INSERT INTO incentives (deal_id, client_id, counselor_id, product_id, milestone_id, clearance_id, gross_base, milestone_pct,
                            share_pct, rate_snapshot, amount, status, reverses_id, created_by)
    VALUES (live.deal_id, live.client_id, live.counselor_id, live.product_id, live.milestone_id, live.clearance_id,
            live.gross_base, live.milestone_pct, live.share_pct, live.rate_snapshot, -live.amount, 'reversed', live.id, p_actor);
    UPDATE incentives SET status = 'reversed' WHERE id = live.id;
    v_changed := v_changed + 1;
  END LOOP;

  IF v_changed > 0 THEN
    PERFORM ledger_audit(p_actor, NULL, 'deal', p_deal, 'incentives_reconciled', NULL,
                         jsonb_build_object('changed', v_changed, 'gross', v_gross, 'cleared', v_cleared));
  END IF;
  RETURN v_changed;
END $$;

-- ---------------------------------------------------------------- triggers
CREATE OR REPLACE FUNCTION trg_reconcile_deal_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v := OLD.deal_id; ELSE v := NEW.deal_id; END IF;
  IF v IS NOT NULL THEN PERFORM ledger_reconcile(v, false, NULL); END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_payments_reconcile ON payments;
CREATE TRIGGER trg_payments_reconcile AFTER INSERT OR UPDATE OF amount, status, deal_id ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_reconcile_deal_child();
DROP TRIGGER IF EXISTS trg_expenses_reconcile ON expenses;
CREATE TRIGGER trg_expenses_reconcile AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION trg_reconcile_deal_child();
DROP TRIGGER IF EXISTS trg_refunds_reconcile ON refunds;
CREATE TRIGGER trg_refunds_reconcile AFTER INSERT OR UPDATE OF status, amount ON refunds
  FOR EACH ROW EXECUTE FUNCTION trg_reconcile_deal_child();
DROP TRIGGER IF EXISTS trg_milestones_reconcile ON milestones;
CREATE TRIGGER trg_milestones_reconcile AFTER INSERT OR UPDATE OR DELETE ON milestones
  FOR EACH ROW EXECUTE FUNCTION trg_reconcile_deal_child();
DROP TRIGGER IF EXISTS trg_shares_reconcile ON case_counselor_shares;
CREATE TRIGGER trg_shares_reconcile AFTER INSERT OR UPDATE OF status, effective_to ON case_counselor_shares
  FOR EACH ROW EXECUTE FUNCTION trg_reconcile_deal_child();

-- Clearing is strict: it fails (and the clearance row is rolled back) when milestone % or share sums are wrong.
CREATE OR REPLACE FUNCTION trg_clearance_reconcile() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM ledger_reconcile(NEW.deal_id, NEW.status = 'cleared', NEW.cleared_by);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_clearance_reconcile ON case_clearance;
CREATE TRIGGER trg_clearance_reconcile AFTER INSERT ON case_clearance
  FOR EACH ROW EXECUTE FUNCTION trg_clearance_reconcile();

-- Withdrawn/rejected after clearance: active incentives go on hold for manual review
CREATE OR REPLACE FUNCTION trg_deal_case_status() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF NEW.case_status IN ('withdrawn', 'rejected') AND OLD.case_status IS DISTINCT FROM NEW.case_status THEN
    FOR r IN SELECT id FROM incentives WHERE deal_id = NEW.id AND status = 'active' LOOP
      UPDATE incentives SET status = 'held', hold_reason = 'Case ' || NEW.case_status || ': review before pay date' WHERE id = r.id;
      INSERT INTO incentive_holds (incentive_id, reason, task_ref) VALUES (r.id, 'Case ' || NEW.case_status || ': review before pay date', 'auto');
    END LOOP;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_deal_case_status ON deals;
CREATE TRIGGER trg_deal_case_status AFTER UPDATE OF case_status ON deals
  FOR EACH ROW EXECUTE FUNCTION trg_deal_case_status();

-- ---------------------------------------------------------------- payroll
CREATE OR REPLACE FUNCTION payroll_build(p_branch uuid, p_period date, p_actor uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  run payroll_runs%ROWTYPE; c record; s salary_structures%ROWTYPE; l record; h record; a record; adv record; v_item uuid;
  v_basic numeric; v_allow numeric; v_ded numeric; v_earned numeric; v_held numeric; v_adj numeric; v_carry numeric;
  v_raw numeric; v_net numeric; v_cout numeric; v_ord integer; v_amt numeric; v_gross0 numeric; v_prev numeric; v_end date;
BEGIN
  p_period := date_trunc('month', p_period)::date;
  v_end := (p_period + interval '1 month' - interval '1 day')::date;
  SELECT * INTO run FROM payroll_runs WHERE branch_id IS NOT DISTINCT FROM p_branch AND period = p_period;
  IF FOUND THEN
    IF run.status <> 'draft' THEN RAISE EXCEPTION 'Payroll for % is already %', p_period, run.status; END IF;
    DELETE FROM payroll_item_lines WHERE payroll_item_id IN (SELECT id FROM payroll_items WHERE payroll_run_id = run.id);
    DELETE FROM payroll_items WHERE payroll_run_id = run.id;
  ELSE
    INSERT INTO payroll_runs (branch_id, period, pay_date, status)
    VALUES (p_branch, p_period, (p_period + interval '1 month' + interval '9 days')::date, 'draft') RETURNING * INTO run;
  END IF;

  FOR c IN SELECT id FROM counselors
            WHERE COALESCE(status, 'active') = 'active' AND role IN ('counselor', 'admin')
              AND (p_branch IS NULL OR branch_id = p_branch) ORDER BY name
  LOOP
    SELECT * INTO s FROM salary_structures
     WHERE counselor_id = c.id AND effective_from <= v_end AND (effective_to IS NULL OR effective_to >= p_period)
     ORDER BY effective_from DESC LIMIT 1;
    IF NOT FOUND THEN CONTINUE; END IF;

    INSERT INTO payroll_items (payroll_run_id, counselor_id) VALUES (run.id, c.id) RETURNING id INTO v_item;
    v_basic := s.basic; v_allow := 0; v_ded := 0; v_ord := 0;
    INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, order_no) VALUES (v_item, 'Basic salary', 'basic', v_basic, v_ord);

    FOR l IN SELECT * FROM salary_structure_lines WHERE structure_id = s.id AND line_type = 'earning' AND calc <> 'percent_of_gross' LOOP
      v_amt := round(CASE l.calc WHEN 'fixed' THEN l.value ELSE v_basic * l.value / 100 END, 2);
      v_allow := v_allow + v_amt; v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, order_no) VALUES (v_item, l.label, 'earning', v_amt, v_ord);
    END LOOP;
    v_gross0 := v_basic + v_allow;
    FOR l IN SELECT * FROM salary_structure_lines WHERE structure_id = s.id AND calc = 'percent_of_gross' LOOP
      v_amt := round(v_gross0 * l.value / 100, 2); v_ord := v_ord + 1;
      IF l.line_type = 'earning' THEN
        v_allow := v_allow + v_amt;
        INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, order_no) VALUES (v_item, l.label, 'earning', v_amt, v_ord);
      ELSE
        v_ded := v_ded + v_amt;
        INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, order_no) VALUES (v_item, l.label, 'deduction', -v_amt, v_ord);
      END IF;
    END LOOP;
    FOR l IN SELECT * FROM salary_structure_lines WHERE structure_id = s.id AND line_type = 'deduction' AND calc <> 'percent_of_gross' LOOP
      v_amt := round(CASE l.calc WHEN 'fixed' THEN l.value ELSE v_basic * l.value / 100 END, 2);
      v_ded := v_ded + v_amt; v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, order_no) VALUES (v_item, l.label, 'deduction', -v_amt, v_ord);
    END LOOP;

    -- incentives cleared and due (case incentives + instructor incentives)
    v_earned := 0;
    FOR h IN SELECT id, amount FROM incentives
              WHERE counselor_id = c.id AND status = 'active' AND payroll_item_id IS NULL AND payable_period <= p_period LOOP
      v_earned := v_earned + h.amount; v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, source_ref, order_no)
      VALUES (v_item, 'Case incentive', 'incentive', h.amount, h.id::text, v_ord);
    END LOOP;
    FOR h IN SELECT id, amount FROM instructor_incentives
              WHERE instructor_id = c.id AND status = 'active' AND payroll_item_id IS NULL AND payable_period <= p_period LOOP
      v_earned := v_earned + h.amount; v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, source_ref, order_no)
      VALUES (v_item, 'Instructor incentive', 'incentive', h.amount, h.id::text, v_ord);
    END LOOP;

    -- held incentives: shown, never netted
    v_held := 0;
    FOR h IN SELECT i.id, i.amount, COALESCE(ih.reason, i.hold_reason, 'on hold') AS reason, ih.task_ref
               FROM incentives i
               LEFT JOIN LATERAL (SELECT reason, task_ref FROM incentive_holds WHERE incentive_id = i.id AND released_at IS NULL
                                   ORDER BY held_at DESC LIMIT 1) ih ON true
              WHERE i.counselor_id = c.id AND i.status = 'held' LOOP
      v_held := v_held + h.amount; v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, source_ref, note, order_no)
      VALUES (v_item, 'Held: ' || h.reason, 'held', h.amount, h.id::text, h.task_ref, v_ord);
    END LOOP;

    -- clawbacks / corrections
    v_adj := 0;
    FOR a IN SELECT id, kind, amount, reason FROM payout_adjustments WHERE counselor_id = c.id AND status = 'pending' LOOP
      v_adj := v_adj + a.amount; v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, source_ref, note, order_no)
      VALUES (v_item, CASE WHEN a.amount > 0 THEN 'Clawback' ELSE 'Correction (credit)' END,
              CASE WHEN a.kind = 'clawback' THEN 'clawback' ELSE 'adjustment' END, -a.amount, a.id::text, a.reason, v_ord);
    END LOOP;

    -- advance repayments (remaining balance)
    FOR adv IN SELECT id, amount - repaid_amount AS remaining FROM staff_advances
                WHERE counselor_id = c.id AND status IN ('approved', 'paid') AND amount > repaid_amount LOOP
      v_adj := v_adj + adv.remaining; v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, source_ref, order_no)
      VALUES (v_item, 'Advance repayment', 'advance_repayment', -adv.remaining, adv.id::text, v_ord);
    END LOOP;

    -- carry-in: shortfall (debt) carried out of the previous month
    SELECT COALESCE(pi.carried_out, 0) INTO v_prev FROM payroll_items pi JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
     WHERE pi.counselor_id = c.id AND pr.period = (p_period - interval '1 month')::date AND pr.status IN ('approved', 'paid')
     ORDER BY pr.created_at DESC LIMIT 1;
    v_carry := -COALESCE(v_prev, 0);
    IF v_carry <> 0 THEN
      v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, order_no) VALUES (v_item, 'Carried in', 'carry_in', v_carry, v_ord);
    END IF;

    v_raw := round(v_basic + v_allow - v_ded + v_earned - v_adj + v_carry, 2);
    v_net := GREATEST(v_raw, 0);
    v_cout := CASE WHEN v_raw < 0 THEN -v_raw ELSE 0 END;
    IF v_cout > 0 THEN
      v_ord := v_ord + 1;
      INSERT INTO payroll_item_lines (payroll_item_id, label, line_type, amount, order_no) VALUES (v_item, 'Carried out', 'carry_out', -v_cout, v_ord);
    END IF;

    UPDATE payroll_items SET basic = v_basic, allowances = v_allow, deductions = v_ded, incentives_earned = v_earned,
           incentives_held = v_held, adjustments = v_adj, carried_in = v_carry, carried_out = v_cout, net = v_net,
           status = CASE WHEN v_cout > 0 AND v_net > 0 THEN 'partial' WHEN v_cout > 0 THEN 'carried_forward' ELSE 'paid' END
     WHERE id = v_item;
  END LOOP;

  PERFORM ledger_audit(p_actor, NULL, 'payroll_run', run.id, 'built', NULL, jsonb_build_object('period', p_period, 'branch', p_branch));
  RETURN run.id;
END $$;

CREATE OR REPLACE FUNCTION payroll_set_status(p_run uuid, p_status text, p_actor uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE run payroll_runs%ROWTYPE; it record; ln record;
BEGIN
  SELECT * INTO run FROM payroll_runs WHERE id = p_run;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll run not found'; END IF;
  IF p_status = 'approved' THEN
    IF run.status <> 'draft' THEN RAISE EXCEPTION 'Only a draft run can be approved'; END IF;
    UPDATE payroll_runs SET status = 'approved', approved_by = p_actor, approved_at = now() WHERE id = p_run;
  ELSIF p_status = 'paid' THEN
    IF run.status <> 'approved' THEN RAISE EXCEPTION 'Approve the run before marking it paid'; END IF;
    FOR it IN SELECT id FROM payroll_items WHERE payroll_run_id = p_run LOOP
      FOR ln IN SELECT * FROM payroll_item_lines WHERE payroll_item_id = it.id AND source_ref IS NOT NULL LOOP
        IF ln.line_type = 'incentive' THEN
          UPDATE incentives SET status = 'paid', payroll_item_id = it.id WHERE id = ln.source_ref::uuid AND status = 'active';
          UPDATE instructor_incentives SET status = 'paid', payroll_item_id = it.id WHERE id = ln.source_ref::uuid AND status = 'active';
        ELSIF ln.line_type IN ('clawback', 'adjustment') THEN
          UPDATE payout_adjustments SET status = 'applied', payroll_item_id = it.id WHERE id = ln.source_ref::uuid;
        ELSIF ln.line_type = 'advance_repayment' THEN
          UPDATE staff_advances SET repaid_amount = repaid_amount + abs(ln.amount),
                 status = CASE WHEN repaid_amount + abs(ln.amount) >= amount THEN 'repaid' ELSE status END
           WHERE id = ln.source_ref::uuid;
        END IF;
      END LOOP;
    END LOOP;
    UPDATE payroll_runs SET status = 'paid' WHERE id = p_run;
  ELSE
    RAISE EXCEPTION 'Unknown status %', p_status;
  END IF;
  PERFORM ledger_audit(p_actor, NULL, 'payroll_run', p_run, 'status_' || p_status, to_jsonb(run), NULL);
END $$;

-- ---------------------------------------------------------------- dispatcher
CREATE OR REPLACE FUNCTION ledger_action(p_action text, p jsonb, p_actor uuid, p_role text, p_branch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid; v_id2 uuid; v_deal deals%ROWTYPE; v_cli clients%ROWTYPE; v_pay payments%ROWTYPE; v_ref refunds%ROWTYPE;
  v_vch vouchers%ROWTYPE; v_inc incentives%ROWTYPE; v_sd stage_definitions%ROWTYPE; v_cs case_stages%ROWTYPE;
  v_lt language_tests%ROWTYPE; v_sess test_sessions%ROWTYPE; v_tpl checklist_templates%ROWTYPE; v_it case_checklist_items%ROWTYPE;
  v_adv staff_advances%ROWTYPE; v_x numeric; v_n integer; s jsonb; v_plan uuid; v_prev jsonb; v_cleared boolean;
BEGIN
  IF p_action = 'voucher.sell' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    SELECT * INTO v_cli FROM clients WHERE id = v_deal.client_id;
    INSERT INTO payments (client_id, amount, payment_method, paid_at, recorded_by, notes, counselor_id, product_id, deal_id, branch_id, payment_kind)
    VALUES (v_deal.client_id, (p->>'price')::numeric, COALESCE(p->>'method', 'cash'), now(), p_actor, p->>'note',
            v_deal.counselor_id, v_deal.product_id, v_deal.id, v_cli.branch_id, 'voucher') RETURNING id INTO v_id;
    INSERT INTO expenses (category, description, amount, paid_at, recorded_by, deal_id, client_id, payment_id, reduce_gross, notes)
    VALUES ('voucher', 'Voucher purchase', (p->>'cost')::numeric, CURRENT_DATE, p_actor, v_deal.id, v_deal.client_id, v_id, true, 'voucher_auto');
    INSERT INTO vouchers (client_id, deal_id, payment_id, face_value, status, valid_until, serial_no)
    VALUES (v_deal.client_id, v_deal.id, v_id, COALESCE(NULLIF(p->>'faceValue', '')::numeric, (p->>'cost')::numeric), 'issued',
            NULLIF(p->>'validUntil', '')::date, p->>'serial') RETURNING id INTO v_id2;
    PERFORM ledger_audit(p_actor, p_role, 'voucher', v_id2, 'sold', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id2, 'paymentId', v_id);

  ELSIF p_action = 'voucher.apply' THEN
    SELECT * INTO v_vch FROM vouchers WHERE id = (p->>'voucherId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Voucher not found'; END IF;
    PERFORM la_assert_client(v_vch.client_id, p_branch);
    IF v_vch.status <> 'issued' THEN RAISE EXCEPTION 'Voucher is %, not issued', v_vch.status; END IF;
    UPDATE vouchers SET status = 'used', used_at = now(), deal_id = COALESCE(NULLIF(p->>'dealId', '')::uuid, deal_id) WHERE id = v_vch.id;
    PERFORM ledger_audit(p_actor, p_role, 'voucher', v_vch.id, 'applied', to_jsonb(v_vch), p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'voucher.decide' THEN   -- needs_decision -> extend / reissue / write off
    SELECT * INTO v_vch FROM vouchers WHERE id = (p->>'voucherId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Voucher not found'; END IF;
    PERFORM la_assert_client(v_vch.client_id, p_branch);
    IF v_vch.status <> 'needs_decision' THEN RAISE EXCEPTION 'Voucher is not awaiting a decision'; END IF;
    IF p->>'decision' = 'extend' THEN
      UPDATE vouchers SET status = 'issued', valid_until = (p->>'newValidUntil')::date, alert_30_sent = false, alert_7_sent = false WHERE id = v_vch.id;
    ELSIF p->>'decision' = 'write_off' THEN
      UPDATE vouchers SET status = 'expired' WHERE id = v_vch.id;
    ELSE RAISE EXCEPTION 'decision must be extend or write_off'; END IF;
    PERFORM ledger_audit(p_actor, p_role, 'voucher', v_vch.id, 'decision_' || (p->>'decision'), to_jsonb(v_vch), p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'vouchers.expire' THEN
    UPDATE vouchers SET status = 'needs_decision' WHERE status = 'issued' AND valid_until IS NOT NULL AND valid_until < CURRENT_DATE;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN jsonb_build_object('ok', true, 'flagged', v_n);

  ELSIF p_action = 'refund.request' THEN
    SELECT * INTO v_pay FROM payments WHERE id = (p->>'paymentId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
    PERFORM la_assert_client(v_pay.client_id, p_branch);
    SELECT COALESCE(sum(amount), 0) INTO v_x FROM refunds WHERE payment_id = v_pay.id AND status IN ('requested', 'approved', 'paid');
    IF v_x + (p->>'amount')::numeric > v_pay.amount THEN RAISE EXCEPTION 'Refunds would exceed the payment (already %)', v_x; END IF;
    IF NULLIF(p->>'voucherId', '') IS NOT NULL THEN
      SELECT * INTO v_vch FROM vouchers WHERE id = (p->>'voucherId')::uuid;
      IF NOT FOUND OR v_vch.payment_id IS DISTINCT FROM v_pay.id THEN RAISE EXCEPTION 'Voucher does not belong to this payment'; END IF;
      IF v_vch.status <> 'issued' THEN RAISE EXCEPTION 'Only an unused voucher can be refunded'; END IF;
    END IF;
    INSERT INTO refunds (payment_id, client_id, deal_id, voucher_id, amount, method, reason, proof_url, status, requested_by)
    VALUES (v_pay.id, v_pay.client_id, v_pay.deal_id, NULLIF(p->>'voucherId', '')::uuid, (p->>'amount')::numeric, p->>'method',
            COALESCE(NULLIF(p->>'reason', ''), 'Refund'), p->>'proofUrl', 'requested', p_actor) RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'refund', v_id, 'requested', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'refund.vendor_confirm' THEN
    SELECT * INTO v_ref FROM refunds WHERE id = (p->>'refundId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
    PERFORM la_assert_client(v_ref.client_id, p_branch);
    UPDATE refunds SET vendor_refund_received = true WHERE id = v_ref.id;
    PERFORM ledger_audit(p_actor, p_role, 'refund', v_ref.id, 'vendor_refund_confirmed', to_jsonb(v_ref), NULL);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'refund.approve' THEN
    SELECT * INTO v_ref FROM refunds WHERE id = (p->>'refundId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
    PERFORM la_assert_client(v_ref.client_id, p_branch);
    IF v_ref.status <> 'requested' THEN RAISE EXCEPTION 'Refund is %', v_ref.status; END IF;
    IF v_ref.voucher_id IS NOT NULL AND NOT v_ref.vendor_refund_received THEN
      RAISE EXCEPTION 'Voucher refunds need the vendor refund confirmed first';
    END IF;
    UPDATE refunds SET status = 'approved', approved_by = p_actor, approved_at = now() WHERE id = v_ref.id;
    PERFORM ledger_audit(p_actor, p_role, 'refund', v_ref.id, 'approved', to_jsonb(v_ref), NULL);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'refund.reject' THEN
    SELECT * INTO v_ref FROM refunds WHERE id = (p->>'refundId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
    PERFORM la_assert_client(v_ref.client_id, p_branch);
    IF v_ref.status NOT IN ('requested', 'approved') THEN RAISE EXCEPTION 'Refund is %', v_ref.status; END IF;
    UPDATE refunds SET status = 'rejected' WHERE id = v_ref.id;
    PERFORM ledger_audit(p_actor, p_role, 'refund', v_ref.id, 'rejected', to_jsonb(v_ref), NULL, p->>'reason');
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'refund.pay' THEN
    SELECT * INTO v_ref FROM refunds WHERE id = (p->>'refundId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
    PERFORM la_assert_client(v_ref.client_id, p_branch);
    IF v_ref.status <> 'approved' THEN RAISE EXCEPTION 'Approve the refund first'; END IF;
    UPDATE refunds SET status = 'paid', paid_at = now() WHERE id = v_ref.id;      -- trigger recomputes incentives / clawbacks
    IF v_ref.voucher_id IS NOT NULL THEN UPDATE vouchers SET status = 'refunded' WHERE id = v_ref.voucher_id; END IF;
    PERFORM ledger_audit(p_actor, p_role, 'refund', v_ref.id, 'paid', to_jsonb(v_ref), NULL);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'clearance.revoke' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    INSERT INTO case_clearance (deal_id, status, cleared_by, notes) VALUES (v_deal.id, 'revoked', p_actor, p->>'notes') RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'case_clearance', v_id, 'revoked', NULL, p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'incentive.hold' THEN
    SELECT * INTO v_inc FROM incentives WHERE id = (p->>'incentiveId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Incentive not found'; END IF;
    PERFORM la_assert_client(v_inc.client_id, p_branch);
    IF v_inc.status <> 'active' THEN RAISE EXCEPTION 'Only an active incentive can be held (is %)', v_inc.status; END IF;
    UPDATE incentives SET status = 'held', hold_reason = p->>'reason' WHERE id = v_inc.id;
    INSERT INTO incentive_holds (incentive_id, reason, task_ref, hold_until, held_by)
    VALUES (v_inc.id, COALESCE(NULLIF(p->>'reason', ''), 'Hold'), p->>'taskRef', NULLIF(p->>'holdUntil', '')::date, p_actor) RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'incentive', v_inc.id, 'held', to_jsonb(v_inc), p);
    RETURN jsonb_build_object('ok', true, 'holdId', v_id);

  ELSIF p_action = 'incentive.release' THEN
    SELECT * INTO v_inc FROM incentives WHERE id = (p->>'incentiveId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Incentive not found'; END IF;
    PERFORM la_assert_client(v_inc.client_id, p_branch);
    IF v_inc.status <> 'held' THEN RAISE EXCEPTION 'Incentive is not held'; END IF;
    UPDATE incentive_holds SET released_at = now(), released_by = p_actor WHERE incentive_id = v_inc.id AND released_at IS NULL;
    IF p->>'action' = 'cancel' THEN
      INSERT INTO incentives (deal_id, client_id, counselor_id, product_id, milestone_id, clearance_id, gross_base, milestone_pct, share_pct,
                              rate_snapshot, amount, status, reverses_id, created_by)
      VALUES (v_inc.deal_id, v_inc.client_id, v_inc.counselor_id, v_inc.product_id, v_inc.milestone_id, v_inc.clearance_id, v_inc.gross_base,
              v_inc.milestone_pct, v_inc.share_pct, v_inc.rate_snapshot, -v_inc.amount, 'reversed', v_inc.id, p_actor);
      UPDATE incentives SET status = 'reversed' WHERE id = v_inc.id;
    ELSE
      SELECT (status = 'cleared') INTO v_cleared FROM case_clearance WHERE deal_id = v_inc.deal_id ORDER BY created_at DESC LIMIT 1;
      UPDATE incentives SET status = CASE WHEN COALESCE(v_cleared, false) THEN 'active' ELSE 'pending_clearance' END, hold_reason = NULL WHERE id = v_inc.id;
    END IF;
    PERFORM ledger_audit(p_actor, p_role, 'incentive', v_inc.id, 'hold_released_' || COALESCE(p->>'action', 'release'), to_jsonb(v_inc), p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'share.request' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    SELECT COALESCE(sum((e->>'pct')::numeric), 0) INTO v_x FROM jsonb_array_elements(p->'shares') e;
    IF abs(v_x - 100) > 0.001 THEN RAISE EXCEPTION 'Shares must sum to 100 (got %)', v_x; END IF;
    UPDATE case_counselor_shares SET status = 'rejected' WHERE deal_id = v_deal.id AND status = 'requested';
    FOR s IN SELECT * FROM jsonb_array_elements(p->'shares') LOOP
      INSERT INTO case_counselor_shares (deal_id, counselor_id, share_pct, requested_by, status)
      VALUES (v_deal.id, (s->>'counselorId')::uuid, (s->>'pct')::numeric, p_actor, 'requested');
    END LOOP;
    PERFORM ledger_audit(p_actor, p_role, 'deal', v_deal.id, 'share_requested', NULL, p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'share.approve' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    IF NOT EXISTS (SELECT 1 FROM case_counselor_shares WHERE deal_id = v_deal.id AND status = 'requested') THEN
      RAISE EXCEPTION 'No share request to approve';
    END IF;
    UPDATE case_counselor_shares SET status = 'approved', approved_by = p_actor, approved_at = now(), effective_from = CURRENT_DATE
     WHERE deal_id = v_deal.id AND status = 'requested';
    UPDATE case_counselor_shares SET effective_to = CURRENT_DATE
     WHERE deal_id = v_deal.id AND status = 'approved' AND effective_to IS NULL AND approved_at < now() - interval '1 second';
    PERFORM ledger_reconcile(v_deal.id, false, p_actor);
    PERFORM ledger_audit(p_actor, p_role, 'deal', v_deal.id, 'share_approved', NULL, p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'share.reject' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    UPDATE case_counselor_shares SET status = 'rejected' WHERE deal_id = v_deal.id AND status = 'requested';
    PERFORM ledger_audit(p_actor, p_role, 'deal', v_deal.id, 'share_rejected', NULL, p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'plan.set' THEN   -- commission plan (percent or tier) per counselor x product
    PERFORM 1 FROM counselors WHERE id = (p->>'counselorId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Counselor not found'; END IF;
    UPDATE commission_plans SET effective_to = CURRENT_DATE - 1
     WHERE counselor_id = (p->>'counselorId')::uuid AND product_id IS NOT DISTINCT FROM NULLIF(p->>'productId', '')::uuid
       AND effective_to IS NULL;
    INSERT INTO commission_plans (counselor_id, product_id, plan_type, rate, created_by)
    VALUES ((p->>'counselorId')::uuid, NULLIF(p->>'productId', '')::uuid, p->>'planType', NULLIF(p->>'rate', '')::numeric, p_actor) RETURNING id INTO v_plan;
    IF p->>'planType' = 'tier' THEN
      FOR s IN SELECT * FROM jsonb_array_elements(p->'tiers') LOOP
        INSERT INTO commission_plan_tiers (plan_id, min_gross, max_gross, rate)
        VALUES (v_plan, (s->>'min')::numeric, NULLIF(s->>'max', '')::numeric, (s->>'rate')::numeric);
      END LOOP;
    END IF;
    PERFORM ledger_audit(p_actor, p_role, 'commission_plan', v_plan, 'set', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_plan);

  ELSIF p_action = 'stage.set' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    IF v_deal.visa_category_id IS NULL THEN RAISE EXCEPTION 'Set the visa category on the case first'; END IF;
    SELECT * INTO v_sd FROM stage_definitions WHERE visa_category_id = v_deal.visa_category_id AND code = p->>'stageCode';
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown stage %', p->>'stageCode'; END IF;
    SELECT * INTO v_cs FROM case_stages WHERE deal_id = v_deal.id AND stage_definition_id = v_sd.id;
    v_prev := CASE WHEN FOUND THEN to_jsonb(v_cs) END;
    INSERT INTO case_stages (deal_id, stage_definition_id, status, started_at, done_at, done_by, notes)
    VALUES (v_deal.id, v_sd.id, p->>'status',
            CASE WHEN p->>'status' IN ('in_progress', 'done') THEN now() END,
            CASE WHEN p->>'status' = 'done' THEN now() END,
            CASE WHEN p->>'status' = 'done' THEN p_actor END, p->>'notes')
    ON CONFLICT (deal_id, stage_definition_id) DO UPDATE
      SET status = EXCLUDED.status, started_at = COALESCE(case_stages.started_at, EXCLUDED.started_at),
          done_at = EXCLUDED.done_at, done_by = EXCLUDED.done_by, notes = COALESCE(EXCLUDED.notes, case_stages.notes)
    RETURNING id INTO v_id;
    IF v_sd.code = 'visa_received' AND p->>'status' = 'done' THEN
      UPDATE deals SET case_status = 'granted', decided_at = now() WHERE id = v_deal.id;
    ELSIF v_sd.code = 'visa_rejected' AND p->>'status' = 'done' THEN
      UPDATE deals SET case_status = 'rejected', decided_at = now(), withdraw_stage_id = v_sd.id WHERE id = v_deal.id;
    END IF;
    PERFORM ledger_audit(p_actor, p_role, 'case_stage', v_id, 'stage_set', v_prev, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'case.withdraw' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    UPDATE deals SET case_status = 'withdrawn', withdraw_reason = COALESCE(NULLIF(p->>'reason', ''), 'Not given'), decided_at = now(),
           withdraw_stage_id = (SELECT id FROM stage_definitions WHERE visa_category_id = v_deal.visa_category_id AND code = p->>'stageCode')
     WHERE id = v_deal.id;
    PERFORM ledger_audit(p_actor, p_role, 'deal', v_deal.id, 'withdrawn', to_jsonb(v_deal), p, p->>'reason');
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'case.update' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    UPDATE deals SET
      visa_category_id = COALESCE(NULLIF(p->>'visaCategoryId', '')::uuid, visa_category_id),
      country_id = COALESCE(NULLIF(p->>'countryId', '')::uuid, country_id),
      program_level_id = COALESCE(NULLIF(p->>'programLevelId', '')::uuid, program_level_id),
      university_id = COALESCE(NULLIF(p->>'universityId', '')::uuid, university_id),
      product_id = COALESCE(NULLIF(p->>'productId', '')::uuid, product_id),
      intake = COALESCE(NULLIF(p->>'intake', ''), intake),
      case_status = COALESCE(NULLIF(p->>'caseStatus', ''), case_status)
     WHERE id = v_deal.id;
    PERFORM ledger_audit(p_actor, p_role, 'deal', v_deal.id, 'case_updated', to_jsonb(v_deal), p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'visit.upsert' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    INSERT INTO visit_visa_cases (deal_id, country_id, intended_travel_from, intended_travel_to, assessment_report_given, assessment_at,
        documents_received, documents_received_at, documents_checklist_complete, documents_complete_at,
        appointment_charges, insurance_charges, itinerary_charges, flags, client_concerns_shared, concerns_at)
    VALUES (v_deal.id, NULLIF(p->>'countryId', '')::uuid, NULLIF(p->>'travelFrom', '')::date, NULLIF(p->>'travelTo', '')::date,
        COALESCE((p->>'assessmentGiven')::boolean, false), CASE WHEN COALESCE((p->>'assessmentGiven')::boolean, false) THEN now() END,
        COALESCE((p->>'docsReceived')::boolean, false), CASE WHEN COALESCE((p->>'docsReceived')::boolean, false) THEN now() END,
        COALESCE((p->>'checklistComplete')::boolean, false), CASE WHEN COALESCE((p->>'checklistComplete')::boolean, false) THEN now() END,
        COALESCE((p->>'appointmentCharges')::numeric, 0), COALESCE((p->>'insuranceCharges')::numeric, 0), COALESCE((p->>'itineraryCharges')::numeric, 0),
        COALESCE(p->'flags', '[]'::jsonb), COALESCE((p->>'concernsShared')::boolean, false), CASE WHEN COALESCE((p->>'concernsShared')::boolean, false) THEN now() END)
    ON CONFLICT (deal_id) DO UPDATE SET
        country_id = COALESCE(EXCLUDED.country_id, visit_visa_cases.country_id),
        intended_travel_from = COALESCE(EXCLUDED.intended_travel_from, visit_visa_cases.intended_travel_from),
        intended_travel_to = COALESCE(EXCLUDED.intended_travel_to, visit_visa_cases.intended_travel_to),
        assessment_report_given = EXCLUDED.assessment_report_given,
        assessment_at = CASE WHEN EXCLUDED.assessment_report_given AND visit_visa_cases.assessment_at IS NULL THEN now() ELSE visit_visa_cases.assessment_at END,
        documents_received = EXCLUDED.documents_received,
        documents_received_at = CASE WHEN EXCLUDED.documents_received AND visit_visa_cases.documents_received_at IS NULL THEN now() ELSE visit_visa_cases.documents_received_at END,
        documents_checklist_complete = EXCLUDED.documents_checklist_complete,
        documents_complete_at = CASE WHEN EXCLUDED.documents_checklist_complete AND visit_visa_cases.documents_complete_at IS NULL THEN now() ELSE visit_visa_cases.documents_complete_at END,
        appointment_charges = EXCLUDED.appointment_charges, insurance_charges = EXCLUDED.insurance_charges,
        itinerary_charges = EXCLUDED.itinerary_charges, flags = EXCLUDED.flags,
        client_concerns_shared = EXCLUDED.client_concerns_shared,
        concerns_at = CASE WHEN EXCLUDED.client_concerns_shared AND visit_visa_cases.concerns_at IS NULL THEN now() ELSE visit_visa_cases.concerns_at END,
        updated_at = now();
    -- the three charges are expenses that reduce gross (one row per kind, kept in sync)
    FOR s IN SELECT jsonb_build_object('kind', t.kind, 'amt', t.amt)
               FROM (VALUES ('appointment', COALESCE((p->>'appointmentCharges')::numeric, 0)),
                            ('insurance',   COALESCE((p->>'insuranceCharges')::numeric, 0)),
                            ('itinerary',   COALESCE((p->>'itineraryCharges')::numeric, 0))) AS t(kind, amt) LOOP
      UPDATE expenses SET amount = (s->>'amt')::numeric, deleted_at = CASE WHEN (s->>'amt')::numeric > 0 THEN NULL ELSE now() END
       WHERE deal_id = v_deal.id AND category = s->>'kind' AND notes = 'visit_auto';
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n = 0 AND (s->>'amt')::numeric > 0 THEN
        INSERT INTO expenses (category, description, amount, paid_at, recorded_by, deal_id, client_id, reduce_gross, notes)
        VALUES (s->>'kind', 'Visit visa ' || (s->>'kind') || ' charges', (s->>'amt')::numeric, CURRENT_DATE, p_actor, v_deal.id, v_deal.client_id, true, 'visit_auto');
      END IF;
    END LOOP;
    PERFORM ledger_audit(p_actor, p_role, 'visit_visa_case', v_deal.id, 'upserted', NULL, p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'checklist.pin' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    IF EXISTS (SELECT 1 FROM case_checklist_items WHERE deal_id = v_deal.id) THEN RAISE EXCEPTION 'Checklist already pinned to this case'; END IF;
    SELECT * INTO v_tpl FROM checklist_templates
     WHERE is_active AND visa_category_id = v_deal.visa_category_id AND country_id IS NOT DISTINCT FROM v_deal.country_id
     ORDER BY version DESC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active checklist template for this category and country'; END IF;
    UPDATE deals SET checklist_template_id = v_tpl.id WHERE id = v_deal.id;
    INSERT INTO case_checklist_items (deal_id, template_item_id, doc_label)
    SELECT v_deal.id, id, doc_label FROM checklist_template_items WHERE template_id = v_tpl.id ORDER BY order_no;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    PERFORM ledger_audit(p_actor, p_role, 'deal', v_deal.id, 'checklist_pinned', NULL, jsonb_build_object('template', v_tpl.id, 'version', v_tpl.version));
    RETURN jsonb_build_object('ok', true, 'items', v_n, 'version', v_tpl.version);

  ELSIF p_action = 'checklist.item' THEN
    SELECT * INTO v_it FROM case_checklist_items WHERE id = (p->>'itemId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Checklist item not found'; END IF;
    SELECT * INTO v_deal FROM deals WHERE id = v_it.deal_id;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    UPDATE case_checklist_items SET status = p->>'status',
        received_at = CASE WHEN p->>'status' IN ('received', 'verified') THEN COALESCE(received_at, now()) ELSE received_at END,
        verified_by = CASE WHEN p->>'status' = 'verified' THEN p_actor ELSE verified_by END
     WHERE id = v_it.id;
    PERFORM ledger_audit(p_actor, p_role, 'case_checklist_item', v_it.id, 'status_set', to_jsonb(v_it), p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'attest.upsert' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    UPDATE attestation_items SET attested_count = (p->>'attestedCount')::int,
        required_count = COALESCE(NULLIF(p->>'requiredCount', '')::int, required_count),
        proof_url = COALESCE(p->>'proofUrl', proof_url)
     WHERE deal_id = v_deal.id AND doc_label = p->>'docLabel' RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      INSERT INTO attestation_items (deal_id, doc_label, required_count, attested_count, proof_url)
      VALUES (v_deal.id, p->>'docLabel', COALESCE(NULLIF(p->>'requiredCount', '')::int, 1), (p->>'attestedCount')::int, p->>'proofUrl') RETURNING id INTO v_id;
    END IF;
    UPDATE attestation_items SET
        status = CASE WHEN attested_count >= required_count THEN 'done' WHEN attested_count > 0 THEN 'partial' ELSE 'pending' END,
        done_at = CASE WHEN attested_count >= required_count THEN COALESCE(done_at, now()) ELSE NULL END
     WHERE id = v_id;
    PERFORM ledger_audit(p_actor, p_role, 'attestation_item', v_id, 'upserted', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'service.charge' THEN
    SELECT * INTO v_deal FROM deals WHERE id = (p->>'dealId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
    PERFORM la_assert_client(v_deal.client_id, p_branch);
    SELECT * INTO v_cli FROM clients WHERE id = v_deal.client_id;
    INSERT INTO payments (client_id, amount, payment_method, paid_at, recorded_by, notes, counselor_id, product_id, deal_id, branch_id, payment_kind)
    VALUES (v_deal.client_id, (p->>'amount')::numeric, COALESCE(p->>'method', 'cash'), now(), p_actor, p->>'description',
            COALESCE(NULLIF(p->>'counselorId', '')::uuid, v_deal.counselor_id), v_deal.product_id, v_deal.id, v_cli.branch_id, 'service') RETURNING id INTO v_id;
    INSERT INTO service_charges (deal_id, service_id, counselor_id, amount, description, approved_by, payment_id)
    VALUES (v_deal.id, NULLIF(p->>'serviceId', '')::uuid, COALESCE(NULLIF(p->>'counselorId', '')::uuid, v_deal.counselor_id),
            (p->>'amount')::numeric, p->>'description', p_actor, v_id) RETURNING id INTO v_id2;
    PERFORM ledger_audit(p_actor, p_role, 'service_charge', v_id2, 'charged', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id2, 'paymentId', v_id);

  ELSIF p_action = 'language.create' THEN
    SELECT * INTO v_cli FROM clients WHERE id = (p->>'clientId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;
    PERFORM la_assert_client(v_cli.id, p_branch);
    INSERT INTO language_tests (client_id, deal_id, exam_org_id, test_type, received_amount, payment_id, payment_proof_url, test_date, created_by)
    VALUES (v_cli.id, NULLIF(p->>'dealId', '')::uuid, NULLIF(p->>'examOrgId', '')::uuid, p->>'testType',
            COALESCE(NULLIF(p->>'receivedAmount', '')::numeric, 0), NULLIF(p->>'paymentId', '')::uuid, p->>'proofUrl',
            NULLIF(p->>'testDate', '')::date, p_actor) RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'language_test', v_id, 'created', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'language.update' THEN
    SELECT * INTO v_lt FROM language_tests WHERE id = (p->>'testId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Test not found'; END IF;
    PERFORM la_assert_client(v_lt.client_id, p_branch);
    UPDATE language_tests SET status = COALESCE(NULLIF(p->>'status', ''), status), result = COALESCE(p->>'result', result),
           test_date = COALESCE(NULLIF(p->>'testDate', '')::date, test_date) WHERE id = v_lt.id;
    PERFORM ledger_audit(p_actor, p_role, 'language_test', v_lt.id, 'updated', to_jsonb(v_lt), p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'instructor.set' THEN   -- instructor capability on existing staff + commission plan
    IF (p->>'enabled')::boolean THEN
      INSERT INTO staff_capabilities (counselor_id, capability) VALUES ((p->>'counselorId')::uuid, 'instructor') ON CONFLICT DO NOTHING;
    ELSE
      DELETE FROM staff_capabilities WHERE counselor_id = (p->>'counselorId')::uuid AND capability = 'instructor';
    END IF;
    PERFORM ledger_audit(p_actor, p_role, 'staff_capability', (p->>'counselorId')::uuid, 'instructor_set', NULL, p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'instructor.plan' THEN
    UPDATE instructor_commission_plans SET effective_to = CURRENT_DATE - 1
     WHERE instructor_id = (p->>'instructorId')::uuid AND session_type = p->>'sessionType' AND effective_to IS NULL;
    INSERT INTO instructor_commission_plans (instructor_id, session_type, plan_type, rate)
    VALUES ((p->>'instructorId')::uuid, p->>'sessionType', 'percent', (p->>'rate')::numeric) RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'instructor_plan', v_id, 'set', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'session.create' THEN
    SELECT * INTO v_lt FROM language_tests WHERE id = (p->>'testId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Test not found'; END IF;
    PERFORM la_assert_client(v_lt.client_id, p_branch);
    IF NOT EXISTS (SELECT 1 FROM staff_capabilities WHERE counselor_id = (p->>'instructorId')::uuid AND capability = 'instructor') THEN
      RAISE EXCEPTION 'That staff member is not an instructor';
    END IF;
    INSERT INTO test_sessions (language_test_id, instructor_id, session_type, scheduled_at, room)
    VALUES (v_lt.id, (p->>'instructorId')::uuid, p->>'sessionType', (p->>'scheduledAt')::timestamptz, p->>'room') RETURNING id INTO v_id;
    UPDATE language_tests SET status = 'scheduled' WHERE id = v_lt.id AND status = 'registered';
    PERFORM ledger_audit(p_actor, p_role, 'test_session', v_id, 'created', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'session.complete' THEN
    SELECT * INTO v_sess FROM test_sessions WHERE id = (p->>'sessionId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
    SELECT * INTO v_lt FROM language_tests WHERE id = v_sess.language_test_id;
    PERFORM la_assert_client(v_lt.client_id, p_branch);
    IF v_sess.status = 'completed' THEN RAISE EXCEPTION 'Session already completed'; END IF;
    SELECT rate INTO v_x FROM instructor_commission_plans
     WHERE instructor_id = v_sess.instructor_id AND session_type = v_sess.session_type
       AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
     ORDER BY effective_from DESC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No instructor commission plan for % sessions', v_sess.session_type; END IF;
    SELECT GREATEST(count(*), 1) INTO v_n FROM test_sessions WHERE language_test_id = v_lt.id AND status <> 'cancelled';
    UPDATE test_sessions SET status = 'completed' WHERE id = v_sess.id;
    INSERT INTO instructor_incentives (test_session_id, instructor_id, gross_base, rate_snapshot, amount, payable_period)
    VALUES (v_sess.id, v_sess.instructor_id, round(v_lt.received_amount / v_n, 2), v_x,
            round(v_lt.received_amount / v_n * v_x / 100, 2), date_trunc('month', now() AT TIME ZONE 'Asia/Karachi')::date) RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'instructor_incentive', v_id, 'created', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'advance.create' THEN
    INSERT INTO staff_advances (counselor_id, amount, purpose, requested_by, approved_by, status)
    VALUES ((p->>'counselorId')::uuid, (p->>'amount')::numeric, p->>'purpose', p_actor,
            CASE WHEN p_role IN ('admin', 'ceo') THEN p_actor END, CASE WHEN p_role IN ('admin', 'ceo') THEN 'approved' ELSE 'requested' END)
    RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'staff_advance', v_id, 'created', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'advance.approve' THEN
    UPDATE staff_advances SET status = 'approved', approved_by = p_actor WHERE id = (p->>'advanceId')::uuid AND status = 'requested';
    PERFORM ledger_audit(p_actor, p_role, 'staff_advance', (p->>'advanceId')::uuid, 'approved', NULL, p);
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'owner.add' THEN   -- CEO only: enforced by the route
    INSERT INTO owner_ledger_entries (entry_date, category, description, amount, method, paid_from, receipt_url, created_by)
    VALUES (COALESCE(NULLIF(p->>'date', '')::date, CURRENT_DATE), p->>'category', p->>'description', (p->>'amount')::numeric,
            p->>'method', p->>'paidFrom', p->>'receiptUrl', p_actor) RETURNING id INTO v_id;
    PERFORM ledger_audit(p_actor, p_role, 'owner_ledger_entry', v_id, 'added', NULL, p);
    RETURN jsonb_build_object('ok', true, 'id', v_id);

  ELSIF p_action = 'payroll.build' THEN
    v_id := payroll_build(NULLIF(p->>'branchId', '')::uuid, (p->>'period')::date, p_actor);
    RETURN jsonb_build_object('ok', true, 'id', v_id);
  ELSIF p_action = 'payroll.approve' THEN
    PERFORM payroll_set_status((p->>'runId')::uuid, 'approved', p_actor);
    RETURN jsonb_build_object('ok', true);
  ELSIF p_action = 'payroll.pay' THEN
    PERFORM payroll_set_status((p->>'runId')::uuid, 'paid', p_actor);
    RETURN jsonb_build_object('ok', true);

  ELSE
    RAISE EXCEPTION 'Unknown action %', p_action;
  END IF;
END $$;

REVOKE ALL ON FUNCTION ledger_action(text, jsonb, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION ledger_reconcile(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION payroll_build(uuid, date, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION payroll_set_status(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- read models (registers, dashboards, query API)
CREATE OR REPLACE VIEW v_clients_wide AS
  SELECT c.id AS client_id, c.client_code, c.name, c.phone, c.email, c.city, c.language, c.target_country, c.status,
         c.pipeline_stage, c.registration_date, c.ad_source, c.counselor_id, co.name AS counselor_name, c.branch_id, b.name AS branch_name
    FROM clients c LEFT JOIN counselors co ON co.id = c.counselor_id LEFT JOIN branches b ON b.id = c.branch_id;

CREATE OR REPLACE VIEW v_cases_wide AS
  SELECT d.id AS deal_id, d.client_id, cl.name AS client_name, cl.city, cl.branch_id, d.counselor_id, co.name AS counselor_name,
         vc.code AS visa_category, d.service_type, pr.name AS product_name, ct.name AS country, pl.label AS program_level,
         un.name AS university, d.intake, d.case_status, cs.label AS current_stage, d.withdraw_reason, ws.label AS withdraw_stage,
         COALESCE(pay.received, 0) AS received, COALESCE(rf.refunded, 0) AS refunded, COALESCE(ex.expenses, 0) AS expenses,
         GREATEST(COALESCE(pay.received, 0) - COALESCE(rf.refunded, 0) - COALESCE(ex.expenses, 0), 0) AS gross,
         COALESCE(inc.pending, 0) AS incentives_pending, COALESCE(inc.active, 0) AS incentives_active,
         COALESCE(inc.held, 0) AS incentives_held, COALESCE(inc.paid, 0) AS incentives_paid,
         clr.status AS clearance_status, d.created_at
    FROM deals d
    JOIN clients cl ON cl.id = d.client_id
    LEFT JOIN counselors co ON co.id = d.counselor_id
    LEFT JOIN visa_categories vc ON vc.id = d.visa_category_id
    LEFT JOIN products pr ON pr.id = d.product_id
    LEFT JOIN countries ct ON ct.id = d.country_id
    LEFT JOIN program_levels pl ON pl.id = d.program_level_id
    LEFT JOIN universities un ON un.id = d.university_id
    LEFT JOIN stage_definitions ws ON ws.id = d.withdraw_stage_id
    LEFT JOIN LATERAL (SELECT sd.label FROM case_stages c2 JOIN stage_definitions sd ON sd.id = c2.stage_definition_id
                        WHERE c2.deal_id = d.id AND c2.status IN ('done', 'in_progress') ORDER BY sd.order_no DESC LIMIT 1) cs ON true
    LEFT JOIN LATERAL (SELECT sum(amount) AS received FROM payments p WHERE p.deal_id = d.id AND COALESCE(p.status, 'recorded') = 'recorded') pay ON true
    LEFT JOIN LATERAL (SELECT sum(amount) AS refunded FROM refunds r WHERE r.deal_id = d.id AND r.status = 'paid') rf ON true
    LEFT JOIN LATERAL (SELECT sum(amount) AS expenses FROM expenses e WHERE e.deal_id = d.id AND e.deleted_at IS NULL AND e.reduce_gross) ex ON true
    LEFT JOIN LATERAL (SELECT sum(amount) FILTER (WHERE status = 'pending_clearance') AS pending,
                              sum(amount) FILTER (WHERE status = 'active') AS active,
                              sum(amount) FILTER (WHERE status = 'held') AS held,
                              sum(amount) FILTER (WHERE status = 'paid') AS paid
                         FROM incentives i WHERE i.deal_id = d.id) inc ON true
    LEFT JOIN LATERAL (SELECT status FROM case_clearance c3 WHERE c3.deal_id = d.id ORDER BY created_at DESC LIMIT 1) clr ON true;

CREATE OR REPLACE VIEW v_incentives_wide AS
  SELECT i.id AS incentive_id, i.deal_id, i.client_id, cl.name AS client_name, cl.branch_id, i.counselor_id, co.name AS counselor_name,
         pr.name AS product_name, m.type AS milestone, i.gross_base, i.milestone_pct, i.share_pct, i.rate_snapshot, i.amount,
         i.status, i.hold_reason, i.payable_period, i.pay_date, i.created_at
    FROM incentives i JOIN clients cl ON cl.id = i.client_id JOIN counselors co ON co.id = i.counselor_id
    LEFT JOIN products pr ON pr.id = i.product_id LEFT JOIN milestones m ON m.id = i.milestone_id
   WHERE i.status <> 'reversed';

CREATE OR REPLACE VIEW v_vouchers_wide AS
  SELECT v.id AS voucher_id, v.client_id, cl.name AS client_name, cl.branch_id, v.deal_id, v.serial_no, v.face_value, v.status,
         v.issued_at, v.valid_until, v.used_at, p.receipt_no, p.amount AS price_paid, pr.name AS product_name,
         CASE WHEN v.status = 'issued' AND v.valid_until IS NOT NULL THEN v.valid_until - CURRENT_DATE END AS days_to_expiry
    FROM vouchers v JOIN clients cl ON cl.id = v.client_id LEFT JOIN payments p ON p.id = v.payment_id LEFT JOIN products pr ON pr.id = v.product_id;

CREATE OR REPLACE VIEW v_refunds_wide AS
  SELECT r.id AS refund_id, r.client_id, cl.name AS client_name, cl.branch_id, r.deal_id, r.payment_id, p.receipt_no, r.amount, r.method,
         r.reason, r.status, r.vendor_refund_received, r.voucher_id, r.requested_at, r.approved_at, r.paid_at
    FROM refunds r JOIN clients cl ON cl.id = r.client_id JOIN payments p ON p.id = r.payment_id;

CREATE OR REPLACE VIEW v_language_wide AS
  SELECT t.id AS test_id, t.client_id, cl.name AS client_name, cl.branch_id, eo.name AS exam_org, t.test_type, t.received_amount,
         t.test_date, t.status, t.result, ts.session_type, ts.scheduled_at, ts.room, ts.status AS session_status,
         ts.instructor_id, ins.name AS instructor_name
    FROM language_tests t JOIN clients cl ON cl.id = t.client_id LEFT JOIN exam_organizations eo ON eo.id = t.exam_org_id
    LEFT JOIN test_sessions ts ON ts.language_test_id = t.id LEFT JOIN counselors ins ON ins.id = ts.instructor_id;

CREATE OR REPLACE VIEW v_payroll_wide AS
  SELECT pi.id AS item_id, pr.id AS run_id, pr.period, pr.pay_date, pr.status AS run_status, pr.branch_id, pi.counselor_id, co.name AS counselor_name,
         pi.basic, pi.allowances, pi.deductions, pi.incentives_earned, pi.incentives_held, pi.adjustments, pi.carried_in, pi.carried_out,
         pi.net, pi.status AS item_status
    FROM payroll_items pi JOIN payroll_runs pr ON pr.id = pi.payroll_run_id JOIN counselors co ON co.id = pi.counselor_id;

CREATE OR REPLACE VIEW v_payroll_lines_wide AS
  SELECT l.id AS line_id, l.payroll_item_id AS item_id, pr.id AS run_id, pr.branch_id, co.name AS counselor_name,
         l.label, l.line_type, l.amount, l.note, l.order_no
    FROM payroll_item_lines l JOIN payroll_items pi ON pi.id = l.payroll_item_id
    JOIN payroll_runs pr ON pr.id = pi.payroll_run_id JOIN counselors co ON co.id = pi.counselor_id;

REVOKE ALL ON v_clients_wide, v_cases_wide, v_incentives_wide, v_vouchers_wide, v_refunds_wide, v_language_wide, v_payroll_wide, v_payroll_lines_wide FROM anon, authenticated;

-- One-time: bring stored incentives in line with the current mock/real data (creates pending_clearance rows)
SELECT count(*) AS reconciled_cases FROM (SELECT ledger_reconcile(id, false, NULL) FROM deals) x;
NOTIFY pgrst, 'reload schema';
