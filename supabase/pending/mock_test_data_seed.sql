-- MOCK TEST DATA. Safe to run more than once (skips if already seeded). Remove with mock_test_data_cleanup.sql.
-- Everything is tagged: clients.notes = 'MOCK_SEED', names start 'TEST ', phones 0399xxxxxxx,
-- invoice numbers 'MOCK-%', payments/expenses notes 'MOCK_SEED', deals.stage_notes 'MOCK_SEED'.
-- Per active counselor it creates 6 clients at different stages:
--  1 Qualified (stage 2), no deal
--  2 Docs in progress (4): study visa, invoice sent, booking payment 50,000
--  3 Application submitted (5): study visa, payments 50,000 + 100,000, expense 15,000, offer-letter milestone
--  4 Visa outcome (6): study visa PKR 200,000 fully paid in 3 installments, 30,000 expenses,
--     milestones offer_letter, loa_cas, visa_filed, visa_granted (NOT cleared: clear it via the clearance route to test incentives)
--  5 Visit visa (5): invoice 60,000 paid in full, appointment+insurance expenses
--  6 Language test (3): IELTS invoice 25,000 sent, unpaid (to test overdue/partial)
-- Run: npx.cmd supabase db query --linked --file supabase/pending/mock_test_data_seed.sql

ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

DO $$
DECLARE
  c record;
  n int := 0;
  k int;
  fnames text[] := ARRAY['Ali','Sara','Usman','Hina','Bilal','Ayesha','Hamza','Fatima','Zain','Maryam','Talha','Noor'];
  lnames text[] := ARRAY['Khan','Ahmed','Malik','Butt','Sheikh','Raza','Iqbal','Chaudhry'];
  p_study uuid; p_visit uuid; p_lang uuid;
  cid uuid; did uuid; iid uuid; pid uuid; eid uuid;
  stage_i int; inv_total numeric; inv_no text;
BEGIN
  IF EXISTS (SELECT 1 FROM clients WHERE notes = 'MOCK_SEED') THEN
    RAISE NOTICE 'Mock data already present; run the cleanup first to reseed.';
    RETURN;
  END IF;

  SELECT id INTO p_study FROM products WHERE category='study_visa' AND is_active ORDER BY created_at LIMIT 1;
  SELECT id INTO p_visit FROM products WHERE category='visit_visa' AND is_active ORDER BY created_at LIMIT 1;
  SELECT id INTO p_lang  FROM products WHERE category='language_test' AND is_active ORDER BY created_at LIMIT 1;

  FOR c IN SELECT id, name, branch_id FROM counselors WHERE role='counselor' AND COALESCE(status,'active')='active' ORDER BY created_at LOOP
    FOR k IN 1..6 LOOP
      n := n + 1;
      stage_i := (ARRAY[2,4,5,6,5,3])[k];

      INSERT INTO clients (name, phone, language, city, counselor_id, branch_id, pipeline_stage, notes, registration_date)
      VALUES ('TEST ' || fnames[1 + (n % 12)] || ' ' || lnames[1 + (n % 8)],
              '0399' || lpad(n::text, 7, '0'), 'English',
              (ARRAY['Lahore','Karachi','Islamabad','Faisalabad'])[1 + (n % 4)],
              c.id, c.branch_id, stage_i, 'MOCK_SEED', now() - (n || ' days')::interval)
      RETURNING id INTO cid;

      INSERT INTO client_assignments (client_id, counselor_id, assigned_at, reason)
      VALUES (cid, c.id, now() - (n || ' days')::interval, 'MOCK_SEED');

      IF k = 1 THEN CONTINUE; END IF;

      -- deal + invoice per scenario
      IF k IN (2,3,4) THEN
        inv_total := CASE k WHEN 2 THEN 200000 WHEN 3 THEN 200000 ELSE 200000 END;
        INSERT INTO deals (client_id, counselor_id, service_type, target_country, deal_value, stage, stage_notes, product_id)
        VALUES (cid, c.id, 'study_visa', 'Germany', inv_total,
                CASE k WHEN 2 THEN 'agreement_signed' WHEN 3 THEN 'in_progress' ELSE 'in_progress' END, 'MOCK_SEED', p_study)
        RETURNING id INTO did;
      ELSIF k = 5 THEN
        inv_total := 60000;
        INSERT INTO deals (client_id, counselor_id, service_type, target_country, deal_value, stage, stage_notes, product_id)
        VALUES (cid, c.id, 'visit_visa', 'Belgium', inv_total, 'in_progress', 'MOCK_SEED', p_visit) RETURNING id INTO did;
      ELSE
        inv_total := 25000;
        INSERT INTO deals (client_id, counselor_id, service_type, target_country, deal_value, stage, stage_notes, product_id)
        VALUES (cid, c.id, 'language_ielts', 'N/A', inv_total, 'agreement_signed', 'MOCK_SEED', p_lang) RETURNING id INTO did;
      END IF;

      inv_no := 'MOCK-' || lpad(n::text, 5, '0');
      INSERT INTO invoices (invoice_number, client_id, deal_id, counselor_id, product_id, line_items, subtotal, total, status, due_date, paid_at)
      VALUES (inv_no, cid, did, c.id,
              CASE WHEN k IN (2,3,4) THEN p_study WHEN k = 5 THEN p_visit ELSE p_lang END,
              jsonb_build_array(jsonb_build_object('description',
                CASE WHEN k IN (2,3,4) THEN 'Germany Study Visa Service Fee' WHEN k = 5 THEN 'Belgium Visit Visa Service Fee' ELSE 'IELTS Preparation' END,
                'amount', inv_total)),
              inv_total, inv_total,
              CASE k WHEN 4 THEN 'paid' WHEN 5 THEN 'paid' WHEN 6 THEN 'overdue' ELSE 'sent' END,
              CURRENT_DATE + CASE k WHEN 6 THEN -10 ELSE 14 END,
              CASE WHEN k IN (4,5) THEN now() - interval '2 days' END)
      RETURNING id INTO iid;

      -- payments (installments)
      IF k = 2 THEN
        INSERT INTO payments (invoice_id, client_id, amount, payment_method, reference_number, paid_at, recorded_by, notes, counselor_id, product_id, deal_id, branch_id)
        VALUES (iid, cid, 50000, 'bank_transfer', 'MOCK-REF-'||n||'-1', now() - interval '6 days', c.id, 'MOCK_SEED', c.id, p_study, did, c.branch_id);
      ELSIF k = 3 THEN
        INSERT INTO payments (invoice_id, client_id, amount, payment_method, reference_number, paid_at, recorded_by, notes, counselor_id, product_id, deal_id, branch_id)
        VALUES (iid, cid, 50000, 'bank_transfer', 'MOCK-REF-'||n||'-1', now() - interval '20 days', c.id, 'MOCK_SEED', c.id, p_study, did, c.branch_id),
               (iid, cid, 100000, 'cash', 'MOCK-REF-'||n||'-2', now() - interval '8 days', c.id, 'MOCK_SEED', c.id, p_study, did, c.branch_id);
        INSERT INTO expenses (category, description, amount, paid_at, recorded_by, notes, deal_id, client_id, reduce_gross)
        VALUES ('embassy', 'MOCK: appointment fee', 15000, CURRENT_DATE - 7, c.id, 'MOCK_SEED', did, cid, true);
        INSERT INTO milestones (deal_id, client_id, product_id, type, occurred_at, holder_counselor_id, recorded_by)
        VALUES (did, cid, p_study, 'offer_letter', now() - interval '9 days', c.id, c.id);
      ELSIF k = 4 THEN
        INSERT INTO payments (invoice_id, client_id, amount, payment_method, reference_number, paid_at, recorded_by, notes, counselor_id, product_id, deal_id, branch_id)
        VALUES (iid, cid, 50000, 'bank_transfer', 'MOCK-REF-'||n||'-1', now() - interval '60 days', c.id, 'MOCK_SEED', c.id, p_study, did, c.branch_id),
               (iid, cid, 100000, 'bank_transfer', 'MOCK-REF-'||n||'-2', now() - interval '30 days', c.id, 'MOCK_SEED', c.id, p_study, did, c.branch_id),
               (iid, cid, 50000, 'cash', 'MOCK-REF-'||n||'-3', now() - interval '3 days', c.id, 'MOCK_SEED', c.id, p_study, did, c.branch_id);
        INSERT INTO expenses (category, description, amount, paid_at, recorded_by, notes, deal_id, client_id, reduce_gross)
        VALUES ('embassy', 'MOCK: embassy + appointment fees', 18000, CURRENT_DATE - 20, c.id, 'MOCK_SEED', did, cid, true),
               ('voucher', 'MOCK: IELTS voucher purchase', 12000, CURRENT_DATE - 40, c.id, 'MOCK_SEED', did, cid, true);
        INSERT INTO milestones (deal_id, client_id, product_id, type, occurred_at, holder_counselor_id, recorded_by)
        VALUES (did, cid, p_study, 'offer_letter', now() - interval '50 days', c.id, c.id),
               (did, cid, p_study, 'loa_cas',      now() - interval '35 days', c.id, c.id),
               (did, cid, p_study, 'visa_filed',   now() - interval '15 days', c.id, c.id),
               (did, cid, p_study, 'visa_granted', now() - interval '2 days',  c.id, c.id);
      ELSIF k = 5 THEN
        INSERT INTO payments (invoice_id, client_id, amount, payment_method, reference_number, paid_at, recorded_by, notes, counselor_id, product_id, deal_id, branch_id)
        VALUES (iid, cid, 60000, 'bank_transfer', 'MOCK-REF-'||n||'-1', now() - interval '5 days', c.id, 'MOCK_SEED', c.id, p_visit, did, c.branch_id);
        INSERT INTO expenses (category, description, amount, paid_at, recorded_by, notes, deal_id, client_id, reduce_gross)
        VALUES ('appointment', 'MOCK: appointment charges', 8000, CURRENT_DATE - 4, c.id, 'MOCK_SEED', did, cid, true),
               ('insurance', 'MOCK: travel insurance', 6000, CURRENT_DATE - 4, c.id, 'MOCK_SEED', did, cid, true);
      END IF;
      -- k = 6: unpaid, overdue invoice, no payment
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Seeded % mock clients', n;
END $$;
