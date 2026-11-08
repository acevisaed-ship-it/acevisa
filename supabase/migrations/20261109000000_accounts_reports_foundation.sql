-- Accounts reports foundation (Release 1). Additive only: new columns, new tables, new views. Nothing is dropped or renamed.
-- Adds: institution partner flag + short code, agents (attached to institutions), source/agent/applied date on cases,
-- stage history view, payments view, combined services view, profit-by-service view, wide cases report view.

-- ---------------------------------------------------------------- institutions (kept in `universities`; the UI calls them institutions)
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------- agents
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text, email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agent_institutions (
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, university_id)
);
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_institutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON agents, agent_institutions FROM anon, authenticated;

-- ---------------------------------------------------------------- case fields
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES agents(id),
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS applied_at date,
  ADD COLUMN IF NOT EXISTS institution_other text,            -- "Other (not listed)": free text until matched to a real institution
  ADD COLUMN IF NOT EXISTS partner_at_application boolean;     -- partner status frozen at application time
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_source_type_check;
ALTER TABLE deals ADD CONSTRAINT deals_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('agent','counselor_referral','walk_in','campaign','direct','other'));
CREATE INDEX IF NOT EXISTS idx_deals_agent ON deals (agent_id);
CREATE INDEX IF NOT EXISTS idx_deals_university ON deals (university_id);
CREATE INDEX IF NOT EXISTS idx_deals_applied_at ON deals (applied_at);
-- Existing cases: approximate application date = date the case was created (new cases will set it explicitly)
UPDATE deals SET applied_at = created_at::date WHERE applied_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments (paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_deal ON payments (deal_id);

-- ---------------------------------------------------------------- stage history (who entered which stage when)
CREATE OR REPLACE VIEW v_stage_history AS
  SELECT cs.deal_id, d.client_id, cl.name AS client_name, cl.branch_id, d.counselor_id, co.name AS counselor_name,
         sd.label AS stage, sd.order_no, cs.status AS stage_status, cs.started_at, cs.done_at,
         COALESCE(cs.started_at, cs.done_at) AS entered_at
    FROM case_stages cs
    JOIN stage_definitions sd ON sd.id = cs.stage_definition_id
    JOIN deals d ON d.id = cs.deal_id
    JOIN clients cl ON cl.id = d.client_id
    LEFT JOIN counselors co ON co.id = d.counselor_id
   WHERE cs.status <> 'pending';

-- ---------------------------------------------------------------- profit per case (cash basis)
-- profit_before_incentives = received - refunds paid - expenses - instructor commission
-- profit_after_incentives  = above - every non-reversed counselor incentive (pending + active + held + paid)
CREATE OR REPLACE VIEW v_profit_by_service AS
  SELECT d.id AS deal_id, d.client_id, cl.name AS client_name, cl.branch_id, d.counselor_id, co.name AS counselor_name,
         COALESCE(vc.code, d.service_type) AS service_type, pr.name AS product_name,
         COALESCE(ct.name, vct.name) AS country, un.name AS university, ag.name AS agent_name, d.case_status,
         COALESCE(inv.invoiced, 0) AS invoiced,
         COALESCE(pay.received, 0) AS received,
         COALESCE(rf.refunded, 0) AS refunded,
         GREATEST(COALESCE(inv.invoiced, 0) - COALESCE(pay.received, 0), 0) AS remaining,
         COALESCE(ex.expenses_total, 0) AS expenses_total,
         COALESCE(ex.expenses_commission, 0) AS expenses_commission,
         COALESCE(ic.instructor_commission, 0) AS instructor_commission,
         COALESCE(inc.pending, 0) AS incentives_pending,
         COALESCE(inc.committed, 0) AS incentives_committed,
         COALESCE(pay.received, 0) - COALESCE(rf.refunded, 0) - COALESCE(ex.expenses_total, 0) - COALESCE(ic.instructor_commission, 0)
           AS profit_before_incentives,
         COALESCE(pay.received, 0) - COALESCE(rf.refunded, 0) - COALESCE(ex.expenses_total, 0) - COALESCE(ic.instructor_commission, 0)
           - COALESCE(inc.pending, 0) - COALESCE(inc.committed, 0) AS profit_after_incentives,
         GREATEST(COALESCE(inv.invoiced, 0), COALESCE(pay.received, 0)) - COALESCE(rf.refunded, 0) - COALESCE(ex.expenses_total, 0)
           - COALESCE(ic.instructor_commission, 0) - COALESCE(inc.pending, 0) - COALESCE(inc.committed, 0) AS profit_expected
    FROM deals d
    JOIN clients cl ON cl.id = d.client_id
    LEFT JOIN counselors co ON co.id = d.counselor_id
    LEFT JOIN visa_categories vc ON vc.id = d.visa_category_id
    LEFT JOIN products pr ON pr.id = d.product_id
    LEFT JOIN countries ct ON ct.id = d.country_id
    LEFT JOIN visit_visa_cases vv ON vv.deal_id = d.id
    LEFT JOIN countries vct ON vct.id = vv.country_id
    LEFT JOIN universities un ON un.id = d.university_id
    LEFT JOIN agents ag ON ag.id = d.agent_id
    LEFT JOIN LATERAL (SELECT sum(i.total) AS invoiced FROM invoices i
                        WHERE i.deal_id = d.id AND i.deleted_at IS NULL AND COALESCE(i.status, '') NOT IN ('draft', 'cancelled', 'void')) inv ON true
    LEFT JOIN LATERAL (SELECT sum(p.amount) AS received FROM payments p
                        WHERE p.deal_id = d.id AND COALESCE(p.status, 'recorded') = 'recorded') pay ON true
    LEFT JOIN LATERAL (SELECT sum(r.amount) AS refunded FROM refunds r WHERE r.deal_id = d.id AND r.status = 'paid') rf ON true
    LEFT JOIN LATERAL (SELECT sum(e.amount) AS expenses_total,
                              sum(e.amount) FILTER (WHERE e.category ILIKE '%commission%') AS expenses_commission
                         FROM expenses e WHERE e.deal_id = d.id AND e.deleted_at IS NULL AND e.reduce_gross) ex ON true
    LEFT JOIN LATERAL (SELECT sum(ii.amount) AS instructor_commission
                         FROM language_tests lt JOIN test_sessions ts ON ts.language_test_id = lt.id
                         JOIN instructor_incentives ii ON ii.test_session_id = ts.id AND ii.status <> 'reversed'
                        WHERE lt.deal_id = d.id) ic ON true
    LEFT JOIN LATERAL (SELECT sum(i.amount) FILTER (WHERE i.status = 'pending_clearance') AS pending,
                              sum(i.amount) FILTER (WHERE i.status IN ('active', 'held', 'paid')) AS committed
                         FROM incentives i WHERE i.deal_id = d.id) inc ON true;

-- ---------------------------------------------------------------- one wide cases view for the filter screen
CREATE OR REPLACE VIEW v_cases_report AS
  SELECT w.deal_id, w.client_id, w.client_name, w.city, w.branch_id, w.counselor_id, w.counselor_name,
         w.visa_category, w.service_type, w.product_name, w.country, w.program_level, w.university, w.intake,
         w.case_status, w.current_stage, w.withdraw_reason, w.clearance_status, w.created_at,
         un.short_code AS institution_code,
         COALESCE(d.partner_at_application, un.is_partner, false) AS is_partner,
         d.institution_other, ag.name AS agent_name, d.source_type, d.applied_at,
         CASE WHEN p.remaining <= 0 AND p.received > 0 THEN 'paid'
              WHEN p.received > 0 THEN 'partial'
              WHEN p.invoiced > 0 THEN 'unpaid' ELSE 'no_invoice' END AS payment_status,
         p.invoiced, p.received, p.refunded, p.remaining, p.expenses_total, p.instructor_commission,
         p.incentives_pending, p.incentives_committed,
         p.profit_before_incentives, p.profit_after_incentives, p.profit_expected
    FROM v_cases_wide w
    JOIN deals d ON d.id = w.deal_id
    JOIN v_profit_by_service p ON p.deal_id = w.deal_id
    LEFT JOIN universities un ON un.id = d.university_id
    LEFT JOIN agents ag ON ag.id = d.agent_id;

-- ---------------------------------------------------------------- payments with every dimension (tuition paid between A and B, by country...)
CREATE OR REPLACE VIEW v_payments_wide AS
  SELECT p.id AS payment_id, p.receipt_no, p.paid_at, p.amount, p.payment_kind, p.payment_method AS method,
         COALESCE(p.status, 'recorded') AS status,
         p.client_id, cl.name AS client_name, COALESCE(p.branch_id, cl.branch_id) AS branch_id,
         p.counselor_id, co.name AS counselor_name, p.deal_id,
         COALESCE(ct.name, vct.name) AS country, un.name AS university, ag.name AS agent_name,
         pr.name AS product_name, COALESCE(vc.code, d.service_type) AS service_type, d.case_status
    FROM payments p
    LEFT JOIN clients cl ON cl.id = p.client_id
    LEFT JOIN counselors co ON co.id = p.counselor_id
    LEFT JOIN deals d ON d.id = p.deal_id
    LEFT JOIN visa_categories vc ON vc.id = d.visa_category_id
    LEFT JOIN countries ct ON ct.id = d.country_id
    LEFT JOIN visit_visa_cases vv ON vv.deal_id = d.id
    LEFT JOIN countries vct ON vct.id = vv.country_id
    LEFT JOIN universities un ON un.id = d.university_id
    LEFT JOIN agents ag ON ag.id = d.agent_id
    LEFT JOIN products pr ON pr.id = COALESCE(p.product_id, d.product_id);

-- ---------------------------------------------------------------- every service a student took, in one list
-- amount = cash received for visa cases, amount paid for language tests, amount charged for ad-hoc services
CREATE OR REPLACE VIEW v_services_wide AS
  SELECT 'case:' || d.id AS service_key, COALESCE(vc.code, d.service_type) AS service_type, pr.name AS sub_type,
         d.client_id, cl.name AS client_name, cl.branch_id, d.counselor_id, co.name AS counselor_name, d.id AS deal_id,
         COALESCE(ct.name, vct.name) AS country, un.name AS institution, ag.name AS agent_name,
         cs.label AS stage, d.case_status AS status, COALESCE(d.applied_at, d.created_at::date) AS service_date,
         COALESCE(pay.received, 0) AS amount
    FROM deals d
    JOIN clients cl ON cl.id = d.client_id
    LEFT JOIN counselors co ON co.id = d.counselor_id
    LEFT JOIN visa_categories vc ON vc.id = d.visa_category_id
    LEFT JOIN products pr ON pr.id = d.product_id
    LEFT JOIN countries ct ON ct.id = d.country_id
    LEFT JOIN visit_visa_cases vv ON vv.deal_id = d.id
    LEFT JOIN countries vct ON vct.id = vv.country_id
    LEFT JOIN universities un ON un.id = d.university_id
    LEFT JOIN agents ag ON ag.id = d.agent_id
    LEFT JOIN LATERAL (SELECT sd.label FROM case_stages c2 JOIN stage_definitions sd ON sd.id = c2.stage_definition_id
                        WHERE c2.deal_id = d.id AND c2.status IN ('done', 'in_progress') ORDER BY sd.order_no DESC LIMIT 1) cs ON true
    LEFT JOIN LATERAL (SELECT sum(p.amount) AS received FROM payments p
                        WHERE p.deal_id = d.id AND COALESCE(p.status, 'recorded') = 'recorded') pay ON true
  UNION ALL
  SELECT 'lang:' || t.id, 'language_test', COALESCE(eo.name || ' ', '') || t.test_type,
         t.client_id, cl.name, cl.branch_id, t.created_by, cr.name, t.deal_id,
         NULL::text, NULL::text, NULL::text, NULL::text, t.status, COALESCE(t.test_date, t.created_at::date), t.received_amount
    FROM language_tests t
    JOIN clients cl ON cl.id = t.client_id
    LEFT JOIN exam_organizations eo ON eo.id = t.exam_org_id
    LEFT JOIN counselors cr ON cr.id = t.created_by
  UNION ALL
  SELECT 'svc:' || sc.id, 'ad_hoc_service', COALESCE(s.name, 'Service'),
         d.client_id, cl.name, cl.branch_id, sc.counselor_id, co.name, sc.deal_id,
         NULL::text, NULL::text, NULL::text, NULL::text, 'charged', sc.charged_at::date, sc.amount
    FROM service_charges sc
    JOIN deals d ON d.id = sc.deal_id
    JOIN clients cl ON cl.id = d.client_id
    LEFT JOIN services s ON s.id = sc.service_id
    LEFT JOIN counselors co ON co.id = sc.counselor_id;

REVOKE ALL ON v_stage_history, v_profit_by_service, v_cases_report, v_payments_wide, v_services_wide FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';
