-- Ledger Phase 1b: installment payments, milestones, stored incentives, product milestone shares,
-- case clearance, shared-case shares, expense links. Additive. NOT YET APPLIED.
-- Depends on 20261107000000_ledger_phase1_audit_assignments.sql.

-- Payments: installments, snapshots, reversal status
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS counselor_id uuid REFERENCES counselors(id),
  ADD COLUMN IF NOT EXISTS product_id   uuid REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS deal_id      uuid REFERENCES deals(id),
  ADD COLUMN IF NOT EXISTS branch_id    uuid,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','reversed')),
  ADD COLUMN IF NOT EXISTS receipt_url  text;

-- Backfill snapshots for existing rows
UPDATE payments p SET
  counselor_id = COALESCE(p.counselor_id, i.counselor_id),
  product_id   = COALESCE(p.product_id, i.product_id),
  deal_id      = COALESCE(p.deal_id, i.deal_id)
FROM invoices i
WHERE p.invoice_id = i.id AND (p.counselor_id IS NULL OR p.product_id IS NULL OR p.deal_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_payments_deal ON payments (deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments (client_id);

-- Expenses: link to the case; reduce gross by default
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS deal_id       uuid REFERENCES deals(id),
  ADD COLUMN IF NOT EXISTS client_id     uuid REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS payment_id    uuid REFERENCES payments(id),
  ADD COLUMN IF NOT EXISTS reduce_gross  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS proof_url     text;
CREATE INDEX IF NOT EXISTS idx_expenses_deal ON expenses (deal_id);

-- Product milestone shares: percentage of case gross per milestone; must sum to 100 per product.
CREATE TABLE IF NOT EXISTS product_milestone_shares (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  milestone_type text NOT NULL CHECK (milestone_type IN ('offer_letter','loa_cas','visa_filed','visa_granted','other')),
  share_pct      numeric(5,2) NOT NULL CHECK (share_pct >= 0 AND share_pct <= 100),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, milestone_type)
);
ALTER TABLE product_milestone_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_milestone_shares FROM anon, authenticated;

-- Milestones: dated record of who held the client
CREATE TABLE IF NOT EXISTS milestones (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id              uuid NOT NULL REFERENCES deals(id),
  client_id            uuid NOT NULL REFERENCES clients(id),
  application_id       uuid REFERENCES applications(id),
  product_id           uuid REFERENCES products(id),
  type                 text NOT NULL CHECK (type IN ('offer_letter','loa_cas','visa_filed','visa_granted','other')),
  occurred_at          timestamptz NOT NULL DEFAULT now(),
  holder_counselor_id  uuid REFERENCES counselors(id),
  recorded_by          uuid REFERENCES counselors(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, type)
);
CREATE INDEX IF NOT EXISTS idx_milestones_deal ON milestones (deal_id);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON milestones FROM anon, authenticated;

-- Case clearance (admin only)
CREATE TABLE IF NOT EXISTS case_clearance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     uuid NOT NULL REFERENCES deals(id),
  status      text NOT NULL CHECK (status IN ('pending','cleared','revoked')),
  cleared_by  uuid REFERENCES counselors(id),
  cleared_at  timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_clearance_deal ON case_clearance (deal_id, created_at DESC);
ALTER TABLE case_clearance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON case_clearance FROM anon, authenticated;

-- Shared cases
CREATE TABLE IF NOT EXISTS case_counselor_shares (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        uuid NOT NULL REFERENCES deals(id),
  counselor_id   uuid NOT NULL REFERENCES counselors(id),
  share_pct      numeric(5,2) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  requested_by   uuid REFERENCES counselors(id),
  status         text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected')),
  approved_by    uuid REFERENCES counselors(id),
  approved_at    timestamptz,
  effective_from date,
  effective_to   date,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_shares_deal ON case_counselor_shares (deal_id);
ALTER TABLE case_counselor_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON case_counselor_shares FROM anon, authenticated;

-- Incentives: stored, never edited in place; recompute = reverse old row + insert new row
CREATE TABLE IF NOT EXISTS incentives (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          uuid NOT NULL REFERENCES deals(id),
  client_id        uuid NOT NULL REFERENCES clients(id),
  counselor_id     uuid NOT NULL REFERENCES counselors(id),
  product_id       uuid REFERENCES products(id),
  milestone_id     uuid REFERENCES milestones(id),
  clearance_id     uuid REFERENCES case_clearance(id),
  gross_base       numeric(12,2) NOT NULL,
  milestone_pct    numeric(5,2) NOT NULL DEFAULT 100,
  share_pct        numeric(5,2) NOT NULL DEFAULT 100,
  rate_snapshot    numeric(5,2) NOT NULL,
  amount           numeric(12,2) NOT NULL,
  status           text NOT NULL DEFAULT 'pending_clearance'
                   CHECK (status IN ('pending_clearance','active','held','paid','reversed')),
  hold_reason      text,
  reverses_id      uuid REFERENCES incentives(id),
  payable_period   date,          -- first day of the payroll month
  pay_date         date,          -- 10th of following month
  payroll_item_id  uuid,
  created_by       uuid REFERENCES counselors(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incentives_deal ON incentives (deal_id);
CREATE INDEX IF NOT EXISTS idx_incentives_counselor ON incentives (counselor_id, status);
CREATE INDEX IF NOT EXISTS idx_incentives_period ON incentives (payable_period);
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON incentives FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
