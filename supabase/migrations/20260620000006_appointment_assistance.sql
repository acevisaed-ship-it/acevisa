-- ============================================================
-- Appointment Assistance product
--
-- Expenses:
--   1. Appointment Cost   (vendor_type: 'appointment')
--   2. Vendor Cost        (vendor_type: 'other')
--
-- Commission:
--   1. Referee Commission   (role: 'referee')
--   2. Counselor Commission (role: 'closer')
-- ============================================================

-- Extend CHECK constraints (000005 may not be applied yet on all environments)
ALTER TABLE product_vendors
  DROP CONSTRAINT IF EXISTS product_vendors_vendor_type_check;

ALTER TABLE product_vendors
  ADD CONSTRAINT product_vendors_vendor_type_check
    CHECK (vendor_type IN (
      'embassy', 'courier', 'institute', 'test_center', 'government',
      'voucher', 'service_charge', 'facility', 'connectivity',
      'appointment', 'other'
    ));

ALTER TABLE product_commission_rules
  DROP CONSTRAINT IF EXISTS product_commission_rules_role_check;

ALTER TABLE product_commission_rules
  ADD CONSTRAINT product_commission_rules_role_check
    CHECK (role IN ('closer', 'referrer', 'support', 'manager', 'instructor', 'referee'));

-- ─── Seed product ─────────────────────────────────────────────────────────────

INSERT INTO products (category, country, name, description, base_price, sort_order)
VALUES (
  'other',
  NULL,
  'Appointment Assistance',
  'Embassy / consulate appointment booking and support service',
  0,
  60
)
ON CONFLICT DO NOTHING;

-- ─── Seed vendor expenses ─────────────────────────────────────────────────────

INSERT INTO product_vendors (product_id, vendor_name, vendor_type, amount_type, amount, currency)
SELECT
  p.id,
  e.vendor_name,
  e.vendor_type,
  'fixed',
  0,
  'PKR'
FROM products p
CROSS JOIN (
  VALUES
    ('Appointment Cost', 'appointment'),
    ('Vendor Cost',      'other')
) AS e(vendor_name, vendor_type)
WHERE
  p.name = 'Appointment Assistance'
  AND NOT EXISTS (
    SELECT 1 FROM product_vendors pv WHERE pv.product_id = p.id
  );

-- ─── Seed commission recipients ───────────────────────────────────────────────

INSERT INTO product_commission_rules (product_id, counselor_id, role, commission_type, commission_value, notes)
SELECT
  p.id,
  NULL,
  r.role,
  'percentage',
  0,
  r.notes
FROM products p
CROSS JOIN (
  VALUES
    ('referee', 'Referee commission — assign counselor and set %'),
    ('closer',  'Counselor commission — assign counselor and set %')
) AS r(role, notes)
WHERE
  p.name = 'Appointment Assistance'
  AND NOT EXISTS (
    SELECT 1 FROM product_commission_rules pcr WHERE pcr.product_id = p.id
  );
