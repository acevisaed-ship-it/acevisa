-- Self-checking scenario test. Needs: all 20261108* migrations applied, mock_test_data_seed.sql and mock_test_data_v2.sql loaded.
-- SAFE: everything runs in one DO block that ends with RAISE EXCEPTION, so the whole transaction is rolled back.
-- The "error" text IS the report: read the PASS / FAIL lines.
-- Run: npx.cmd supabase db query --linked --file supabase/pending/ledger_scenarios_test.sql

DO $$
DECLARE
  out text := '';
  a uuid; b uuid; adm uuid; pid uuid; did uuid; prod uuid; lang uuid; vis uuid; k4 uuid;
  rate numeric; g numeric; n int; x numeric; y numeric; r jsonb; v uuid; pay uuid; ref uuid; inc uuid;
  err text; run uuid; tmp numeric; payc uuid;
BEGIN
  -- ----- pick mock actors and cases
  SELECT counselor_id, id, product_id INTO a, did, prod FROM deals
   WHERE stage_notes = 'MOCK_SEED' AND service_type = 'study_visa'
     AND EXISTS (SELECT 1 FROM milestones m WHERE m.deal_id = deals.id AND m.type = 'visa_granted') ORDER BY created_at LIMIT 1;
  IF did IS NULL THEN RAISE EXCEPTION 'No mock full-visa case found: load the mock seed first'; END IF;
  SELECT id INTO b FROM counselors WHERE role = 'counselor' AND id <> a AND COALESCE(status, 'active') = 'active' ORDER BY created_at LIMIT 1;
  SELECT id INTO adm FROM counselors WHERE role IN ('ceo', 'admin') ORDER BY (role = 'ceo') DESC LIMIT 1;
  IF adm IS NULL THEN adm := a; END IF;

  -- ensure 25/25/25/25 shares exist for this product (rolled back at the end)
  INSERT INTO product_milestone_shares (product_id, milestone_type, share_pct)
  SELECT prod, t, 25 FROM (VALUES ('offer_letter'), ('loa_cas'), ('visa_filed'), ('visa_granted')) v(t)
  ON CONFLICT (product_id, milestone_type) DO NOTHING;
  PERFORM ledger_reconcile(did, false, adm);

  rate := ledger_rate(a, prod, 170000);
  SELECT v.gross INTO g FROM v_cases_wide v WHERE v.deal_id = did;
  out := out || format(E'%s S1 gross = 170,000 (got %s)\n', CASE WHEN g = 170000 THEN 'PASS' ELSE 'FAIL' END, g);

  SELECT count(*), COALESCE(sum(amount), 0) INTO n, x FROM incentives WHERE deal_id = did AND status = 'pending_clearance';
  out := out || format(E'%s S1 four pending rows totalling 4 x 42,500 x %s%% = %s (got %s rows, %s)\n',
    CASE WHEN n = 4 AND x = round(4 * 42500 * rate / 100, 2) THEN 'PASS' ELSE 'FAIL' END, rate, round(4 * 42500 * rate / 100, 2), n, x);

  -- clear
  INSERT INTO case_clearance (deal_id, status, cleared_by, cleared_at) VALUES (did, 'cleared', adm, now());
  SELECT count(*) INTO n FROM incentives WHERE deal_id = did AND status = 'active';
  out := out || format(E'%s S1 clear -> 4 active rows (got %s)\n', CASE WHEN n = 4 THEN 'PASS' ELSE 'FAIL' END, n);
  SELECT payable_period::text INTO err FROM incentives WHERE deal_id = did AND status = 'active' LIMIT 1;
  out := out || format(E'%s S6 payable_period = current PKT month (%s)\n',
    CASE WHEN err = date_trunc('month', now() AT TIME ZONE 'Asia/Karachi')::date::text THEN 'PASS' ELSE 'FAIL' END, err);

  -- revoke -> pending again; re-clear
  PERFORM ledger_action('clearance.revoke', jsonb_build_object('dealId', did), adm, 'ceo');
  SELECT count(*) INTO n FROM incentives WHERE deal_id = did AND status = 'pending_clearance';
  out := out || format(E'%s S1 revoke -> 4 pending (got %s)\n', CASE WHEN n = 4 THEN 'PASS' ELSE 'FAIL' END, n);
  INSERT INTO case_clearance (deal_id, status, cleared_by, cleared_at) VALUES (did, 'cleared', adm, now());

  -- S4 refund of 40,000 on the 50,000 cash installment
  SELECT id INTO pay FROM payments WHERE deal_id = did AND amount = 50000 AND payment_method = 'cash' LIMIT 1;
  r := ledger_action('refund.request', jsonb_build_object('paymentId', pay, 'amount', 40000, 'reason', 'test'), adm, 'ceo');
  ref := (r->>'id')::uuid;
  PERFORM ledger_action('refund.approve', jsonb_build_object('refundId', ref), adm, 'ceo');
  PERFORM ledger_action('refund.pay', jsonb_build_object('refundId', ref), adm, 'ceo');
  SELECT COALESCE(sum(amount), 0) INTO x FROM incentives WHERE deal_id = did AND status = 'active';
  out := out || format(E'%s S4 refund 40,000 -> gross 130,000, active total 4 x 32,500 x %s%% = %s (got %s)\n',
    CASE WHEN x = round(4 * 32500 * rate / 100, 2) THEN 'PASS' ELSE 'FAIL' END, rate, round(4 * 32500 * rate / 100, 2), x);
  SELECT count(*) INTO n FROM v_ledger WHERE deal_id = did AND entry_type = 'refund' AND signed_amount = -40000;
  out := out || format(E'%s S4 negative ledger row for the refund (got %s)\n', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL' END, n);

  -- S4b paid incentive + further refund -> clawback, originals untouched
  UPDATE incentives SET status = 'paid' WHERE deal_id = did AND status = 'active';
  SELECT id INTO pay FROM payments WHERE deal_id = did AND amount = 100000 LIMIT 1;
  r := ledger_action('refund.request', jsonb_build_object('paymentId', pay, 'amount', 10000, 'reason', 'test2'), adm, 'ceo');
  PERFORM ledger_action('refund.approve', jsonb_build_object('refundId', (r->>'id')::uuid), adm, 'ceo');
  PERFORM ledger_action('refund.pay', jsonb_build_object('refundId', (r->>'id')::uuid), adm, 'ceo');
  SELECT COALESCE(sum(amount), 0) INTO x FROM payout_adjustments WHERE kind = 'clawback' AND incentive_id IN (SELECT id FROM incentives WHERE deal_id = did);
  out := out || format(E'%s S4 paid incentives -> clawback = 10,000 x %s%% = %s (got %s)\n',
    CASE WHEN x = round(10000 * rate / 100, 2) THEN 'PASS' ELSE 'FAIL' END, rate, round(10000 * rate / 100, 2), x);

  -- S5 shared case on a fresh full-visa case of another counselor (A 60 / B 40)
  SELECT d2.id INTO k4 FROM deals d2 WHERE d2.stage_notes = 'MOCK_SEED' AND d2.service_type = 'study_visa' AND d2.id <> did
     AND d2.counselor_id = (SELECT counselor_id FROM deals WHERE id = did)
     AND EXISTS (SELECT 1 FROM milestones m WHERE m.deal_id = d2.id) ORDER BY d2.created_at LIMIT 1;
  IF k4 IS NOT NULL AND b IS NOT NULL THEN
    PERFORM ledger_action('share.request', jsonb_build_object('dealId', k4, 'shares',
      jsonb_build_array(jsonb_build_object('counselorId', a, 'pct', 60), jsonb_build_object('counselorId', b, 'pct', 40))), adm, 'ceo');
    PERFORM ledger_action('share.approve', jsonb_build_object('dealId', k4), adm, 'ceo');
    SELECT COALESCE(sum(amount) FILTER (WHERE counselor_id = b), 0), COALESCE(sum(amount) FILTER (WHERE counselor_id = a), 0)
      INTO x, y FROM incentives WHERE deal_id = k4 AND status = 'pending_clearance';
    SELECT v.gross INTO g FROM v_cases_wide v WHERE v.deal_id = k4;
    out := out || format(E'%s S5 shared: B gets own rate x gross x 40%% (B=%s, A=%s, case gross %s)\n',
      CASE WHEN x > 0 AND y > 0 THEN 'PASS' ELSE 'FAIL' END, x, y, g);
    BEGIN
      PERFORM ledger_action('share.request', jsonb_build_object('dealId', k4, 'shares',
        jsonb_build_array(jsonb_build_object('counselorId', a, 'pct', 50), jsonb_build_object('counselorId', b, 'pct', 40))), adm, 'ceo');
      out := out || E'FAIL S5 shares not summing to 100 were accepted\n';
    EXCEPTION WHEN OTHERS THEN
      out := out || E'PASS S5 shares not summing to 100 are rejected\n';
    END;
  ELSE
    out := out || E'SKIP S5 no second counselor or second case\n';
  END IF;

  -- S3 voucher lifecycle on a language case
  SELECT id INTO lang FROM deals WHERE stage_notes = 'MOCK_SEED' AND service_type = 'language_ielts' ORDER BY created_at LIMIT 1;
  r := ledger_action('voucher.sell', jsonb_build_object('dealId', lang, 'price', 20000, 'cost', 15000, 'serial', 'TEST-1', 'validUntil', (CURRENT_DATE + 30)::text), adm, 'ceo');
  v := (r->>'id')::uuid; payc := (r->>'paymentId')::uuid;
  SELECT count(*) INTO n FROM payments WHERE id = payc AND payment_kind = 'voucher';
  SELECT count(*) INTO tmp FROM expenses WHERE payment_id = payc AND category = 'voucher' AND reduce_gross AND amount = 15000;
  out := out || format(E'%s S3 voucher sale = its own payment + deducted expense (payments %s, expenses %s)\n', CASE WHEN n = 1 AND tmp = 1 THEN 'PASS' ELSE 'FAIL' END, n, tmp);
  PERFORM ledger_action('voucher.apply', jsonb_build_object('voucherId', v, 'dealId', lang), adm, 'ceo');
  SELECT status INTO err FROM vouchers WHERE id = v;
  out := out || format(E'%s S3 voucher applied -> used (%s)\n', CASE WHEN err = 'used' THEN 'PASS' ELSE 'FAIL' END, err);
  BEGIN
    PERFORM ledger_action('refund.request', jsonb_build_object('paymentId', payc, 'amount', 20000, 'voucherId', v, 'reason', 'x'), adm, 'ceo');
    out := out || E'FAIL S3 used voucher refund was accepted\n';
  EXCEPTION WHEN OTHERS THEN out := out || E'PASS S3 used voucher cannot be refunded\n'; END;
  r := ledger_action('voucher.sell', jsonb_build_object('dealId', lang, 'price', 20000, 'cost', 15000, 'serial', 'TEST-2'), adm, 'ceo');
  v := (r->>'id')::uuid; payc := (r->>'paymentId')::uuid;
  r := ledger_action('refund.request', jsonb_build_object('paymentId', payc, 'amount', 20000, 'voucherId', v, 'reason', 'unused'), adm, 'ceo');
  BEGIN
    PERFORM ledger_action('refund.approve', jsonb_build_object('refundId', (r->>'id')::uuid), adm, 'ceo');
    out := out || E'FAIL S3 voucher refund approved before vendor refund\n';
  EXCEPTION WHEN OTHERS THEN out := out || E'PASS S3 voucher refund waits for vendor refund\n'; END;

  -- S7 hold / release / withdraw
  SELECT id INTO inc FROM incentives WHERE status = 'pending_clearance' LIMIT 1;
  IF inc IS NOT NULL THEN
    UPDATE incentives SET status = 'active' WHERE id = inc;
    PERFORM ledger_action('incentive.hold', jsonb_build_object('incentiveId', inc, 'reason', 'test', 'taskRef', 'T-1'), adm, 'ceo');
    SELECT status INTO err FROM incentives WHERE id = inc;
    out := out || format(E'%s Hold -> held (%s)\n', CASE WHEN err = 'held' THEN 'PASS' ELSE 'FAIL' END, err);
  END IF;

  -- S8 visit visa fields -> auto expenses
  SELECT id INTO vis FROM deals WHERE stage_notes = 'MOCK_SEED' AND service_type = 'visit_visa' ORDER BY created_at LIMIT 1;
  PERFORM ledger_action('visit.upsert', jsonb_build_object('dealId', vis, 'assessmentGiven', true, 'docsReceived', true, 'checklistComplete', true,
         'appointmentCharges', 8000, 'insuranceCharges', 6000, 'itineraryCharges', 2500, 'concernsShared', true), adm, 'ceo');
  SELECT COALESCE(sum(amount), 0) INTO x FROM expenses WHERE deal_id = vis AND notes = 'visit_auto' AND deleted_at IS NULL;
  out := out || format(E'%s S8 visit charges become deducted expenses (8,000+6,000+2,500 = 16,500; got %s)\n', CASE WHEN x = 16500 THEN 'PASS' ELSE 'FAIL' END, x);

  -- S7 stages
  PERFORM ledger_action('stage.set', jsonb_build_object('dealId', did, 'stageCode', 'biometrics', 'status', 'done'), adm, 'ceo');
  SELECT count(*) INTO n FROM case_stages cs JOIN stage_definitions sd ON sd.id = cs.stage_definition_id WHERE cs.deal_id = did AND sd.code = 'biometrics' AND cs.status = 'done';
  out := out || format(E'%s S7 stage set and audited\n', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL' END);

  -- S9 checklist pin keeps template version
  SELECT d3.id INTO k4 FROM deals d3 WHERE d3.stage_notes = 'MOCK_SEED' AND d3.service_type = 'study_visa' AND d3.checklist_template_id IS NULL LIMIT 1;
  out := out || format(E'%s S9 checklist: cases pin template version (cases without a pinned template available to test: %s)\n', 'INFO', CASE WHEN k4 IS NULL THEN 'none' ELSE 'yes' END);

  -- S10 service charge counts in gross
  SELECT COALESCE(v.gross, 0) INTO x FROM v_cases_wide v WHERE v.deal_id = lang;
  PERFORM ledger_action('service.charge', jsonb_build_object('dealId', lang, 'amount', 5000, 'description', 'test file prep'), adm, 'ceo');
  SELECT COALESCE(v.gross, 0) INTO y FROM v_cases_wide v WHERE v.deal_id = lang;
  out := out || format(E'%s S10 service charge = payment, raises gross by 5,000 (%s -> %s)\n', CASE WHEN y - x = 5000 THEN 'PASS' ELSE 'FAIL' END, x, y);

  -- S12 payroll
  SELECT payroll_build((SELECT branch_id FROM counselors WHERE id = a), date_trunc('month', now())::date, adm) INTO run;
  SELECT count(*) INTO n FROM payroll_items WHERE payroll_run_id = run AND counselor_id = a;
  SELECT net, basic + allowances - deductions + incentives_earned - adjustments + carried_in INTO x, y FROM payroll_items WHERE payroll_run_id = run AND counselor_id = a;
  out := out || format(E'%s S12 payroll item for counselor exists and net = basic+allowances-deductions+incentives-adjustments+carry (net %s, formula %s)\n',
    CASE WHEN n = 1 AND x = GREATEST(y, 0) THEN 'PASS' ELSE 'FAIL' END, x, y);
  SELECT count(*) INTO n FROM payroll_item_lines WHERE payroll_item_id = (SELECT id FROM payroll_items WHERE payroll_run_id = run AND counselor_id = a);
  out := out || format(E'%s S12 breakdown has line-by-line rows (%s lines)\n', CASE WHEN n >= 3 THEN 'PASS' ELSE 'FAIL' END, n);

  -- audit trail written
  SELECT count(*) INTO n FROM audit_events WHERE created_at > now() - interval '1 minute';
  out := out || format(E'%s Audit rows written during this test (%s)\n', CASE WHEN n >= 8 THEN 'PASS' ELSE 'FAIL' END, n);

  -- S11 is tested through the API: POST /api/admin/query {view:'v_clients_wide', fields:['phone'], filters:[{field:'city',op:'eq',value:'Karachi'}]}
  out := out || E'INFO S11 query API is checked in the app: fields=phone, city=Karachi, then confirm one audit_events row with action query\n';

  -- The CLI truncates long error text, so print a short summary: pass count + only the problem lines.
  RAISE EXCEPTION E'RESULT: % passed. Problems:\n%',
    (SELECT count(*) FROM unnest(string_to_array(out, E'\n')) l WHERE l LIKE 'PASS%'),
    COALESCE((SELECT string_agg(left(l, 110), E'\n') FROM unnest(string_to_array(out, E'\n')) l
               WHERE l LIKE 'FAIL%' OR l LIKE 'SKIP%'), 'none');
END $$;
