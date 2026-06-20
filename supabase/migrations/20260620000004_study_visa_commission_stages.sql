-- ============================================================
-- Seed 4 commission-disbursement payment stages for all Study Visa products.
-- Stage 4 (Got Visa) is marked as fixed-PKR commission in the UI via stage name.
--
-- Only inserts if a study_visa product has no stages yet.
-- ============================================================

INSERT INTO product_payment_stages (product_id, stage_order, stage_name, amount_type, due_trigger, notes)
SELECT
  p.id,
  s.stage_order,
  s.stage_name,
  s.amount_type,
  s.due_trigger,
  s.notes
FROM products p
CROSS JOIN (
  VALUES
    (1, 'Offer Letter Received',                'percentage', 'on_application', 'Commission disbursed when offer letter is received from the institute'),
    (2, 'LOA / CAS / Ministry Order Received',  'percentage', 'on_approval',    'Commission disbursed on Letter of Acceptance, CAS, or Ministry Order'),
    (3, 'Visa Filing',                          'percentage', 'on_approval',    'Commission disbursed when visa application is filed'),
    (4, 'Got Visa',                             'fixed',      'on_visa',        'Fixed PKR amount per counselor — disbursed when visa is granted')
) AS s(stage_order, stage_name, amount_type, due_trigger, notes)
WHERE
  p.category = 'study_visa'
  AND NOT EXISTS (
    SELECT 1 FROM product_payment_stages ps WHERE ps.product_id = p.id
  );
