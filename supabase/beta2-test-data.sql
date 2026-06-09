-- Beta 2 test data seed — run in Supabase SQL Editor before checklist testing
-- Idempotent: uses ON CONFLICT or existence checks where possible

-- Counselor IDs (adjust if your DB uses different UUIDs — script looks up by name)
DO $$
DECLARE
  aneeqa_id uuid;
  arooj_id uuid;
  zara_id uuid;
  imran_id uuid;
  maryam_id uuid;
  tariq_id uuid;
  hina_id uuid;
  sana_id uuid;
  ali_id uuid;
BEGIN
  SELECT id INTO aneeqa_id FROM counselors WHERE name ILIKE 'Aneeqa%' AND role = 'counselor' LIMIT 1;
  SELECT id INTO arooj_id FROM counselors WHERE name ILIKE 'Arooj%' AND role = 'counselor' LIMIT 1;

  IF aneeqa_id IS NULL OR arooj_id IS NULL THEN
    RAISE EXCEPTION 'Counselors Aneeqa and Arooj must exist before seeding';
  END IF;

  -- Unassigned pool
  INSERT INTO clients (name, phone, language, city, counselor_id, ad_source, pipeline_stage, qualification_score)
  VALUES
    ('Zara', '03001234001', 'english', 'Lahore', NULL, 'uk-study-2026', 1, 72),
    ('Imran', '03001234002', 'english', 'Karachi', NULL, 'ca-jobs-2026', 1, 65),
    ('Maryam', '03001234003', 'urdu', 'Islamabad', NULL, 'ielts-2026', 1, 58),
    ('Tariq', '03001234004', 'english', 'Rawalpindi', NULL, 'direct', 1, 45)
  ON CONFLICT DO NOTHING;

  -- Hina assigned to Arooj (for transfer test)
  INSERT INTO clients (name, phone, language, city, counselor_id, ad_source, pipeline_stage, qualification_score)
  VALUES ('Hina', '03001234005', 'english', 'Lahore', arooj_id, 'uk-study-2026', 2, 80)
  ON CONFLICT DO NOTHING;

  SELECT id INTO hina_id FROM clients WHERE name = 'Hina' LIMIT 1;
  IF hina_id IS NOT NULL AND EXISTS (SELECT 1 FROM clients WHERE id = hina_id AND counselor_id IS DISTINCT FROM arooj_id) THEN
    UPDATE clients SET counselor_id = arooj_id WHERE id = hina_id;
  END IF;

  -- Profile update test clients
  INSERT INTO clients (name, phone, language, city, counselor_id, ad_source, pipeline_stage)
  VALUES
    ('Sana', '03001234006', 'english', 'Lahore', aneeqa_id, 'direct', 3),
    ('Ali', '03001234007', 'english', 'Karachi', aneeqa_id, 'direct', 2)
  ON CONFLICT DO NOTHING;

  SELECT id INTO sana_id FROM clients WHERE name = 'Sana' LIMIT 1;
  SELECT id INTO ali_id FROM clients WHERE name = 'Ali' LIMIT 1;

  -- Pending profile update requests for Sana and Ali
  IF sana_id IS NOT NULL THEN
    INSERT INTO profile_update_requests (client_id, triggered_by_message, proposed_changes, reviewed_fields, status)
    SELECT sana_id, 'I moved to Islamabad', '{"city": "I moved to Islamabad"}'::jsonb, '{}'::jsonb, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM profile_update_requests WHERE client_id = sana_id AND status = 'pending'
    );
  END IF;

  IF ali_id IS NOT NULL THEN
    INSERT INTO profile_update_requests (client_id, triggered_by_message, proposed_changes, reviewed_fields, status)
    SELECT ali_id, 'I am now in Faisalabad', '{"city": "I am now in Faisalabad"}'::jsonb, '{}'::jsonb, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM profile_update_requests WHERE client_id = ali_id AND status = 'pending'
    );
  END IF;

  -- Sample open tasks for counselor counts
  IF hina_id IS NOT NULL THEN
    INSERT INTO tasks (counselor_id, client_id, task_text, due_date, status)
    SELECT arooj_id, hina_id, 'Follow up with Hina on UK application', now() + interval '2 days', 'pending'
    WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE client_id = hina_id AND task_text LIKE 'Follow up with Hina%');
  END IF;

  RAISE NOTICE 'Beta 2 test data seeded. Unassigned: Zara, Imran, Maryam, Tariq. Hina → Arooj.';
END $$;
