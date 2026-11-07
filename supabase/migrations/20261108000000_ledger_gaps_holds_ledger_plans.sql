-- Ledger gaps: holds, payout adjustments, receipt numbers, voucher serials, unified ledger view,
-- commission plans (percent/tier). Additive. NOT YET APPLIED. Depends on 20261107*.

-- Receipt numbers (unique, human readable)
CREATE SEQUENCE IF NOT EXISTS receipt_no_seq;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_no text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_kind text NOT NULL DEFAULT 'consultancy'
  CHECK (payment_kind IN ('consultancy','voucher','service','other'));
UPDATE payments SET receipt_no = 'RCP-' || lpad(nextval('receipt_no_seq')::text, 6, '0') WHERE receipt_no IS NULL;
ALTER TABLE payments ALTER COLUMN receipt_no SET DEFAULT ('RCP-' || lpad(nextval('receipt_no_seq')::text, 6, '0'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_receipt_no ON payments (receipt_no);

-- Vouchers: serial + issue date, one payment per voucher
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS serial_no text;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS issued_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS uq_vouchers_payment ON vouchers (payment_id) WHERE payment_id IS NOT NULL;

-- Incentive holds (reason + task ref + release)
CREATE TABLE IF NOT EXISTS incentive_holds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incentive_id  uuid NOT NULL REFERENCES incentives(id),
  reason        text NOT NULL,
  task_ref      text,
  hold_until    date,
  held_by       uuid REFERENCES counselors(id),
  held_at       timestamptz NOT NULL DEFAULT now(),
  released_at   timestamptz,
  released_by   uuid REFERENCES counselors(id)
);
CREATE INDEX IF NOT EXISTS idx_incentive_holds_inc ON incentive_holds (incentive_id);

-- Clawbacks / adjustments applied on the next payroll
CREATE TABLE IF NOT EXISTS payout_adjustments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id     uuid NOT NULL REFERENCES counselors(id),
  incentive_id     uuid REFERENCES incentives(id),
  refund_id        uuid REFERENCES refunds(id),
  kind             text NOT NULL CHECK (kind IN ('clawback','correction','advance_repayment')),
  amount           numeric(12,2) NOT NULL,      -- positive = deduct from staff
  reason           text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','cancelled')),
  payroll_item_id  uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payout_adj_counselor ON payout_adjustments (counselor_id, status);

-- Commission plans: per counselor x product, percent or tier (no flat amounts)
CREATE TABLE IF NOT EXISTS commission_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id   uuid NOT NULL REFERENCES counselors(id),
  product_id     uuid REFERENCES products(id),     -- NULL = all products
  plan_type      text NOT NULL CHECK (plan_type IN ('percent','tier')),
  rate           numeric(5,2),                     -- for percent
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to   date,
  created_by     uuid REFERENCES counselors(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (plan_type <> 'percent' OR rate IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS commission_plan_tiers (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id   uuid NOT NULL REFERENCES commission_plans(id) ON DELETE CASCADE,
  min_gross numeric(12,2) NOT NULL DEFAULT 0,
  max_gross numeric(12,2),
  rate      numeric(5,2) NOT NULL
);

-- Unified ledger: payments (+), refunds paid (-), expenses (-) with counselor, case, branch
CREATE OR REPLACE VIEW v_ledger AS
  SELECT p.id AS entry_id, 'payment'::text AS entry_type, p.paid_at AS occurred_at, p.amount AS signed_amount,
         p.client_id, p.deal_id, p.counselor_id, p.product_id, p.branch_id, p.receipt_no AS ref, p.payment_method AS method
  FROM payments p WHERE COALESCE(p.status,'recorded') = 'recorded'
  UNION ALL
  SELECT r.id, 'refund', COALESCE(r.paid_at, r.requested_at), -r.amount,
         r.client_id, r.deal_id, pay.counselor_id, pay.product_id, pay.branch_id, pay.receipt_no, r.method
  FROM refunds r JOIN payments pay ON pay.id = r.payment_id WHERE r.status = 'paid'
  UNION ALL
  SELECT e.id, 'expense', e.paid_at::timestamptz, -e.amount,
         e.client_id, e.deal_id, NULL::uuid, NULL::uuid, NULL::uuid, e.category, NULL::text
  FROM expenses e WHERE e.deleted_at IS NULL AND e.deal_id IS NOT NULL;
REVOKE ALL ON v_ledger FROM anon, authenticated;

ALTER TABLE incentive_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_plan_tiers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON incentive_holds, payout_adjustments, commission_plans, commission_plan_tiers FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';
