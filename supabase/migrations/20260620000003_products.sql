-- ============================================================
-- Products catalog
-- Categories: study_visa | visit_visa | work_abroad | language_test | other
-- Each country variant is its own product row (Study Visa – UK, Study Visa – Sweden, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL CHECK (category IN ('study_visa','visit_visa','work_abroad','language_test','other')),
  country     text,                        -- NULL for global products (e.g. IELTS)
  name        text NOT NULL,               -- e.g. "Study Visa – Sweden"
  description text,
  base_price  numeric(12,2) DEFAULT 0,
  currency    text NOT NULL DEFAULT 'PKR',
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Payment stages — what the client pays and when
-- ============================================================

CREATE TABLE IF NOT EXISTS product_payment_stages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stage_order  integer NOT NULL DEFAULT 1,
  stage_name   text NOT NULL,              -- "Booking Fee", "Processing Fee", "Final Payment"
  amount_type  text NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed','percentage')),
  amount       numeric(12,2) DEFAULT 0,    -- used when amount_type = 'fixed'
  percentage   numeric(5,2) DEFAULT 0,     -- used when amount_type = 'percentage'
  due_trigger  text NOT NULL DEFAULT 'manual'
    CHECK (due_trigger IN ('on_signup','on_application','on_approval','on_visa','on_completion','manual')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Vendor / expense breakdown — where money goes out per case
-- ============================================================

CREATE TABLE IF NOT EXISTS product_vendors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_name  text NOT NULL,              -- "Embassy Fee", "DHL Courier", "British Council"
  vendor_type  text NOT NULL DEFAULT 'other'
    CHECK (vendor_type IN ('embassy','courier','institute','test_center','government','other')),
  amount_type  text NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed','percentage')),
  amount       numeric(12,2) DEFAULT 0,
  percentage   numeric(5,2) DEFAULT 0,
  currency     text NOT NULL DEFAULT 'PKR',
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Commission sharing rules per product
-- Defines which counselors share commission and at what %
-- ============================================================

CREATE TABLE IF NOT EXISTS product_commission_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  counselor_id        uuid REFERENCES counselors(id) ON DELETE CASCADE,   -- NULL = "whoever closes"
  role                text NOT NULL DEFAULT 'closer'
    CHECK (role IN ('closer','referrer','support','manager')),
  commission_type     text NOT NULL DEFAULT 'percentage'
    CHECK (commission_type IN ('percentage','fixed')),
  commission_value    numeric(10,2) NOT NULL DEFAULT 0,   -- % or PKR
  applies_to_stage    integer,    -- NULL = applies to total; or specific stage_order
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Seed common products
INSERT INTO products (category, country, name, base_price, sort_order) VALUES
  ('study_visa', 'United Kingdom',   'Study Visa – United Kingdom',   150000, 10),
  ('study_visa', 'Sweden',           'Study Visa – Sweden',           120000, 11),
  ('study_visa', 'Germany',          'Study Visa – Germany',          120000, 12),
  ('study_visa', 'Canada',           'Study Visa – Canada',           180000, 13),
  ('study_visa', 'Australia',        'Study Visa – Australia',        180000, 14),
  ('visit_visa', 'UAE',              'Visit Visa – UAE',               60000, 20),
  ('visit_visa', 'United Kingdom',   'Visit Visa – United Kingdom',   100000, 21),
  ('visit_visa', 'Schengen',         'Visit Visa – Schengen',          80000, 22),
  ('work_abroad','United Kingdom',   'Work Abroad – United Kingdom',  200000, 30),
  ('work_abroad','Germany',          'Work Abroad – Germany',         180000, 31),
  ('language_test', NULL,            'IELTS Preparation',              50000, 40),
  ('language_test', NULL,            'PTE Preparation',                45000, 41)
ON CONFLICT DO NOTHING;
