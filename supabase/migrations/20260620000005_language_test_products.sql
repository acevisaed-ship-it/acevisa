-- ============================================================
-- Language Test product structure
-- Two product types:
--   1. Preparation          – 3 sub-types (Complete / Short / Interview)
--   2. With Facility & Notes – same 3 sub-types, with deductible expense breakdown
--
-- Expense breakdown (Facility products):
--   Vendors  : Voucher/Booking, Booking Service Charges, Facility, Connectivity
--   Commission: Instructor 1, Instructor 2 (split), Referee Commission
-- ============================================================

-- ─── Extend CHECK constraints to include language-test-specific types ──────────

ALTER TABLE product_vendors
  DROP CONSTRAINT IF EXISTS product_vendors_vendor_type_check;

ALTER TABLE product_vendors
  ADD CONSTRAINT product_vendors_vendor_type_check
    CHECK (vendor_type IN (
      'embassy', 'courier', 'institute', 'test_center', 'government',
      'voucher', 'service_charge', 'facility', 'connectivity',
      'other'
    ));

ALTER TABLE product_commission_rules
  DROP CONSTRAINT IF EXISTS product_commission_rules_role_check;

ALTER TABLE product_commission_rules
  ADD CONSTRAINT product_commission_rules_role_check
    CHECK (role IN ('closer', 'referrer', 'support', 'manager', 'instructor', 'referee'));

-- ─── Remove old generic seeds (will be replaced with typed products) ──────────

DELETE FROM products
WHERE category = 'language_test'
  AND name IN ('IELTS Preparation', 'PTE Preparation');

-- ─── Preparation products (no facility) ──────────────────────────────────────

INSERT INTO products (category, country, name, description, base_price, sort_order)
VALUES
  ('language_test', NULL, 'IELTS – Complete Course',           'Full IELTS preparation (Listening, Reading, Writing, Speaking)',  35000, 40),
  ('language_test', NULL, 'IELTS – Short Course (Speaking)',   'Speaking-only IELTS preparation',                                 20000, 41),
  ('language_test', NULL, 'IELTS – Interview Preparation',     'IELTS interview-focused preparation session',                     25000, 42),
  ('language_test', NULL, 'PTE – Complete Course',             'Full PTE preparation (all modules)',                              35000, 43),
  ('language_test', NULL, 'PTE – Short Course (Speaking)',     'Speaking-only PTE preparation',                                   20000, 44),
  ('language_test', NULL, 'PTE – Interview Preparation',       'PTE interview-focused preparation session',                       25000, 45)
ON CONFLICT DO NOTHING;

-- ─── Preparation with Facility & Notes products ───────────────────────────────

INSERT INTO products (category, country, name, description, base_price, sort_order)
VALUES
  ('language_test', NULL, 'IELTS – Complete Course (with Facility)',         'Full IELTS prep + facility, notes, and connectivity included',   50000, 50),
  ('language_test', NULL, 'IELTS – Short Course (with Facility)',            'Speaking-only IELTS prep + facility and connectivity included',  30000, 51),
  ('language_test', NULL, 'IELTS – Interview Preparation (with Facility)',   'IELTS interview prep + facility and connectivity included',      38000, 52),
  ('language_test', NULL, 'PTE – Complete Course (with Facility)',           'Full PTE prep + facility, notes, and connectivity included',     50000, 53),
  ('language_test', NULL, 'PTE – Short Course (with Facility)',              'Speaking-only PTE prep + facility and connectivity included',    30000, 54),
  ('language_test', NULL, 'PTE – Interview Preparation (with Facility)',     'PTE interview prep + facility and connectivity included',        38000, 55)
ON CONFLICT DO NOTHING;

-- ─── Default vendor expense breakdown for all "with Facility" products ────────
-- Seeds zero-amount rows so the expense structure is visible from day one;
-- admin fills in actual amounts.

INSERT INTO product_vendors (product_id, vendor_name, vendor_type, amount_type, amount, currency)
SELECT
  p.id,
  e.vendor_name,
  e.vendor_type,
  'fixed'::text,
  0,
  'PKR'
FROM products p
CROSS JOIN (
  VALUES
    ('Voucher / Booking Charges',   'voucher'),
    ('Booking Service Charges',     'service_charge'),
    ('Facility Charges',            'facility'),
    ('Connectivity Charges',        'connectivity')
) AS e(vendor_name, vendor_type)
WHERE
  p.category = 'language_test'
  AND p.name LIKE '%(with Facility)%'
  AND NOT EXISTS (
    SELECT 1 FROM product_vendors pv WHERE pv.product_id = p.id
  );

-- ─── Default commission recipients for "with Facility" products ───────────────
-- Two instructors (split) + one referee. counselor_id = NULL until admin assigns.

INSERT INTO product_commission_rules (product_id, counselor_id, role, commission_type, commission_value, notes)
SELECT
  p.id,
  NULL,
  r.role,
  r.commission_type,
  0,
  r.notes
FROM products p
CROSS JOIN (
  VALUES
    ('instructor', 'percentage', 'Instructor 1 share — assign counselor and set %'),
    ('instructor', 'percentage', 'Instructor 2 share — assign counselor and set %'),
    ('referee',    'percentage', 'Referee commission — assign counselor and set %')
) AS r(role, commission_type, notes)
WHERE
  p.category = 'language_test'
  AND p.name LIKE '%(with Facility)%'
  AND NOT EXISTS (
    SELECT 1 FROM product_commission_rules pcr WHERE pcr.product_id = p.id
  );
