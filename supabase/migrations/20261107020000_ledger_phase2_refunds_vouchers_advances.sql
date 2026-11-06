-- Ledger Phase 2: refunds, vendor purchases, vouchers, staff advances, CEO owner ledger.
-- Additive. NOT YET APPLIED. Depends on 20261107010000.
-- Request shape: requested -> approved -> paid (or rejected). Transitions go to audit_events.

CREATE TABLE IF NOT EXISTS vendor_purchases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor           text NOT NULL,
  product_id       uuid REFERENCES products(id),
  amount_sent      numeric(12,2) NOT NULL DEFAULT 0,
  amount_deducted  numeric(12,2) NOT NULL DEFAULT 0,
  balance          numeric(12,2) NOT NULL DEFAULT 0,
  purchased_on     date NOT NULL DEFAULT CURRENT_DATE,
  bought_from      text,
  proof_url        text,
  created_by       uuid REFERENCES counselors(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vouchers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id),
  deal_id             uuid REFERENCES deals(id),
  payment_id          uuid REFERENCES payments(id),
  vendor_purchase_id  uuid REFERENCES vendor_purchases(id),
  product_id          uuid REFERENCES products(id),
  expense_id          uuid REFERENCES expenses(id),  -- auto-created deducted expense
  code_ref            text,                           -- store reference only; actual code access-restricted
  face_value          numeric(12,2) NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'issued'
                      CHECK (status IN ('issued','used','expired','needs_decision','refunded')),
  valid_until         date,
  used_at             timestamptz,
  alert_30_sent       boolean NOT NULL DEFAULT false,
  alert_7_sent        boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vouchers_client ON vouchers (client_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_valid ON vouchers (status, valid_until);

CREATE TABLE IF NOT EXISTS refunds (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id                uuid NOT NULL REFERENCES payments(id),
  client_id                 uuid NOT NULL REFERENCES clients(id),
  deal_id                   uuid REFERENCES deals(id),
  voucher_id                uuid REFERENCES vouchers(id),
  amount                    numeric(12,2) NOT NULL CHECK (amount > 0),
  method                    text,
  reason                    text NOT NULL,
  proof_url                 text,
  vendor_refund_received    boolean NOT NULL DEFAULT false,
  status                    text NOT NULL DEFAULT 'requested'
                            CHECK (status IN ('requested','approved','paid','rejected')),
  requested_by              uuid REFERENCES counselors(id),
  approved_by               uuid REFERENCES counselors(id),
  requested_at              timestamptz NOT NULL DEFAULT now(),
  approved_at               timestamptz,
  paid_at                   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds (payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds (status);

CREATE TABLE IF NOT EXISTS staff_advances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id    uuid NOT NULL REFERENCES counselors(id),
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  purpose         text,
  given_on        date NOT NULL DEFAULT CURRENT_DATE,
  requested_by    uuid REFERENCES counselors(id),
  approved_by     uuid REFERENCES counselors(id),
  status          text NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','approved','paid','repaid','rejected')),
  repaid_amount   numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_advances_counselor ON staff_advances (counselor_id);

-- CEO-only; excluded from every business P&L
CREATE TABLE IF NOT EXISTS owner_ledger_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date   date NOT NULL DEFAULT CURRENT_DATE,
  category     text NOT NULL,
  description  text,
  amount       numeric(12,2) NOT NULL,
  method       text,
  paid_from    text,
  receipt_url  text,
  created_by   uuid REFERENCES counselors(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendor_purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds               ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_advances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_ledger_entries  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vendor_purchases, vouchers, refunds, staff_advances, owner_ledger_entries FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
