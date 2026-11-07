-- MOCK DATA v2 on top of mock_test_data_seed.sql. Needs migrations 20261108* applied and milestone shares seeded.
-- Tagged: universities 'TEST %', vouchers serial 'MOCK-%', services charges description 'MOCK', checklist template notes via item 'MOCK'.
-- Remove with mock_test_data_v2_cleanup.sql (run BEFORE mock_test_data_cleanup.sql).
DO $$
DECLARE
  c record; d record; i int := 0; cid uuid; did uuid; iid uuid; pid uuid; vid uuid; ltid uuid;
  cat_study uuid; cat_visit uuid; lvl_pg uuid; lvl_ug uuid; ctry_de uuid; ctry_be uuid; uni uuid; tpl uuid;
  first_inst uuid; second_c uuid; exam uuid; svc uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM universities WHERE name LIKE 'TEST %') THEN RAISE NOTICE 'v2 already seeded'; RETURN; END IF;
  SELECT id INTO cat_study FROM visa_categories WHERE code='study';
  SELECT id INTO cat_visit FROM visa_categories WHERE code='visit';
  SELECT id INTO lvl_pg FROM program_levels WHERE code='pg';
  SELECT id INTO lvl_ug FROM program_levels WHERE code='ug';
  SELECT id INTO ctry_de FROM countries WHERE name='Germany';
  SELECT id INTO ctry_be FROM countries WHERE name='Belgium';
  SELECT id INTO exam FROM exam_organizations ORDER BY name LIMIT 1;
  INSERT INTO universities (country_id, name) VALUES (ctry_de,'TEST Technical University Berlin') RETURNING id INTO uni;

  -- Checklist template (study x Germany v1) + attestation requirements
  INSERT INTO checklist_templates (visa_category_id, country_id, version) VALUES (cat_study, ctry_de, 901) RETURNING id INTO tpl;
  INSERT INTO checklist_template_items (template_id, doc_label, order_no) VALUES
    (tpl,'MOCK Passport',1),(tpl,'MOCK Degree certificate',2),(tpl,'MOCK Transcript',3),(tpl,'MOCK Language certificate',4),(tpl,'MOCK Bank statement',5);
  INSERT INTO attestation_requirements (country_id, doc_label, required_count, stage_label, version) VALUES
    (ctry_de,'MOCK Degree',2,'Before visa application',901),(ctry_de,'MOCK Transcript',2,'Before visa application',901);

  -- Typed cases for the v1 mock deals
  FOR d IN SELECT dl.id, dl.service_type, dl.client_id, dl.counselor_id, dl.deal_value,
                  (SELECT count(*) FROM deals x WHERE x.counselor_id = dl.counselor_id AND x.stage_notes='MOCK_SEED' AND x.created_at <= dl.created_at) AS rn
           FROM deals dl WHERE dl.stage_notes = 'MOCK_SEED' LOOP
    i := i + 1;
    IF d.service_type = 'study_visa' THEN
      UPDATE deals SET visa_category_id=cat_study, country_id=ctry_de, program_level_id=CASE WHEN i%2=0 THEN lvl_pg ELSE lvl_ug END,
        university_id=uni, intake='Oct 2026', checklist_template_id=tpl WHERE id=d.id;
      INSERT INTO case_checklist_items (deal_id, template_item_id, doc_label, status, received_at)
        SELECT d.id, ti.id, ti.doc_label, (ARRAY['received','verified','missing','received','na'])[1 + ((i + ti.order_no) % 5)],
               CASE WHEN (i + ti.order_no) % 5 IN (0,1,3) THEN now() - interval '5 days' END
        FROM checklist_template_items ti WHERE ti.template_id = tpl;
      INSERT INTO attestation_items (deal_id, requirement_id, doc_label, required_count, attested_count, status)
        SELECT d.id, r.id, r.doc_label, r.required_count, (i % 3), CASE WHEN i%3=0 THEN 'pending' WHEN i%3=1 THEN 'partial' ELSE 'done' END
        FROM attestation_requirements r WHERE r.version = 901;
      -- stage progress by how far the mock case is
      INSERT INTO case_stages (deal_id, stage_definition_id, status, started_at, done_at)
        SELECT d.id, sd.id,
               CASE WHEN sd.order_no <= CASE WHEN d.deal_value=200000 AND EXISTS (SELECT 1 FROM milestones m WHERE m.deal_id=d.id AND m.type='visa_granted') THEN 10
                                             WHEN EXISTS (SELECT 1 FROM milestones m WHERE m.deal_id=d.id) THEN 4 ELSE 1 END THEN 'done'
                    WHEN sd.order_no = CASE WHEN EXISTS (SELECT 1 FROM milestones m WHERE m.deal_id=d.id AND m.type='visa_granted') THEN 99
                                            WHEN EXISTS (SELECT 1 FROM milestones m WHERE m.deal_id=d.id) THEN 5 ELSE 2 END THEN 'in_progress'
                    ELSE 'pending' END,
               now() - interval '10 days', now() - interval '5 days'
        FROM stage_definitions sd WHERE sd.visa_category_id = cat_study AND sd.code NOT IN ('visa_rejected','withdrawn');
      -- every 7th study case: withdrawn with reason and stage
      IF i % 7 = 0 THEN
        UPDATE deals SET case_status='withdrawn', withdraw_reason='MOCK: client chose another country',
          withdraw_stage_id=(SELECT id FROM stage_definitions WHERE visa_category_id=cat_study AND code='admission_processed'), decided_at=now()
        WHERE id=d.id;
      END IF;
    ELSIF d.service_type = 'visit_visa' THEN
      UPDATE deals SET visa_category_id=cat_visit, country_id=ctry_be WHERE id=d.id;
      INSERT INTO visit_visa_cases (deal_id, country_id, intended_travel_from, intended_travel_to, assessment_report_given, assessment_at,
          documents_received, documents_received_at, documents_checklist_complete, documents_complete_at,
          appointment_charges, insurance_charges, itinerary_charges, flags, client_concerns_shared, concerns_at)
        VALUES (d.id, ctry_be, CURRENT_DATE + 45, CURRENT_DATE + 60, true, now()-interval '8 days', true, now()-interval '6 days', true, now()-interval '4 days',
          8000, 6000, 0, '["MOCK: limited travel history"]'::jsonb, true, now()-interval '3 days');
      INSERT INTO case_stages (deal_id, stage_definition_id, status, done_at)
        SELECT d.id, sd.id, CASE WHEN sd.order_no <= 7 THEN 'done' ELSE 'pending' END, now()-interval '3 days'
        FROM stage_definitions sd WHERE sd.visa_category_id = cat_visit;
    END IF;
  END LOOP;

  -- Instructor + first/second counselor
  SELECT id INTO first_inst FROM counselors WHERE role='counselor' AND COALESCE(status,'active')='active' ORDER BY created_at LIMIT 1;
  SELECT id INTO second_c   FROM counselors WHERE role='counselor' AND COALESCE(status,'active')='active' ORDER BY created_at OFFSET 1 LIMIT 1;
  INSERT INTO staff_capabilities (counselor_id, capability) VALUES (first_inst,'instructor') ON CONFLICT DO NOTHING;
  INSERT INTO instructor_commission_plans (instructor_id, session_type, plan_type, rate) VALUES (first_inst,'LRW','percent',10),(first_inst,'Speaking','percent',15);

  -- Language/voucher cases on the qualified (k=1) clients: paid voucher sale, expense, language test, sessions
  i := 0;
  FOR c IN SELECT cl.id AS client_id, cl.counselor_id, cl.branch_id FROM clients cl WHERE cl.notes='MOCK_SEED' AND cl.pipeline_stage=2 LOOP
    i := i + 1;
    INSERT INTO deals (client_id, counselor_id, service_type, target_country, deal_value, stage, stage_notes)
      VALUES (c.client_id, c.counselor_id, 'language_ielts','N/A', 25000, 'in_progress','MOCK_SEED') RETURNING id INTO did;
    INSERT INTO invoices (invoice_number, client_id, deal_id, counselor_id, line_items, subtotal, total, status, paid_at)
      VALUES ('MOCK-V2-'||lpad(i::text,4,'0'), c.client_id, did, c.counselor_id,
              '[{"description":"IELTS test voucher + booking","amount":25000}]'::jsonb, 25000, 25000, 'paid', now()-interval '4 days') RETURNING id INTO iid;
    INSERT INTO payments (invoice_id, client_id, amount, payment_method, paid_at, recorded_by, notes, counselor_id, deal_id, branch_id, payment_kind)
      VALUES (iid, c.client_id, 25000, 'bank_transfer', now()-interval '4 days', c.counselor_id, 'MOCK_SEED', c.counselor_id, did, c.branch_id, 'voucher') RETURNING id INTO pid;
    INSERT INTO expenses (category, description, amount, paid_at, recorded_by, notes, deal_id, client_id, reduce_gross)
      VALUES ('voucher','MOCK: voucher purchase from exam body',20000, CURRENT_DATE-4, c.counselor_id,'MOCK_SEED', did, c.client_id, true);
    INSERT INTO vouchers (client_id, deal_id, payment_id, face_value, status, valid_until, serial_no, used_at)
      VALUES (c.client_id, did, pid, 20000, CASE WHEN i%2=0 THEN 'used' ELSE 'issued' END,
              CURRENT_DATE + CASE WHEN i%3=0 THEN 5 WHEN i%3=1 THEN 25 ELSE 120 END, 'MOCK-VCH-'||lpad(i::text,5,'0'),
              CASE WHEN i%2=0 THEN now()-interval '1 day' END) RETURNING id INTO vid;
    INSERT INTO language_tests (client_id, deal_id, exam_org_id, test_type, received_amount, payment_id, test_date, status, result)
      VALUES (c.client_id, did, exam, (ARRAY['LRW','Speaking','Both'])[1 + (i%3)], 25000, pid, CURRENT_DATE + (i%10),
              CASE WHEN i%2=0 THEN 'completed' ELSE 'scheduled' END, CASE WHEN i%2=0 THEN 'Band 6.5' END) RETURNING id INTO ltid;
    INSERT INTO test_sessions (language_test_id, instructor_id, session_type, scheduled_at, room, status)
      VALUES (ltid, first_inst, CASE WHEN i%2=0 THEN 'LRW' ELSE 'Speaking' END, now() + (i||' days')::interval, 'Room 1', CASE WHEN i%2=0 THEN 'completed' ELSE 'scheduled' END);
    -- every 3rd unused voucher: a refund request awaiting vendor refund
    IF i%2=1 AND i%3=0 THEN
      INSERT INTO refunds (payment_id, client_id, deal_id, voucher_id, amount, method, reason, status, requested_by, vendor_refund_received)
        VALUES (pid, c.client_id, did, vid, 20000, 'bank_transfer','MOCK: client cancelled test','requested', c.counselor_id, false);
    END IF;
  END LOOP;

  -- Ad-hoc service charge + payment on unpaid IELTS clients (k=6, no commission impact)
  SELECT id INTO svc FROM services WHERE category='file_prep' LIMIT 1;
  FOR d IN SELECT dl.id, dl.client_id, dl.counselor_id, cl.branch_id FROM deals dl JOIN clients cl ON cl.id=dl.client_id
           WHERE dl.stage_notes='MOCK_SEED' AND dl.service_type='language_ielts' AND cl.pipeline_stage=3 LOOP
    INSERT INTO payments (client_id, amount, payment_method, paid_at, recorded_by, notes, counselor_id, deal_id, branch_id, payment_kind)
      VALUES (d.client_id, 5000, 'cash', now()-interval '2 days', d.counselor_id, 'MOCK_SEED', d.counselor_id, d.id, d.branch_id, 'service') RETURNING id INTO pid;
    INSERT INTO service_charges (deal_id, service_id, counselor_id, amount, description, approved_by, payment_id)
      VALUES (d.id, svc, d.counselor_id, 5000, 'MOCK: file preparation on recommendation', d.counselor_id, pid);
  END LOOP;

  -- A requested 60/40 share on the first counselor's full-visa case (not approved: use it to test approval)
  SELECT dl.id INTO did FROM deals dl JOIN milestones m ON m.deal_id=dl.id AND m.type='visa_granted'
    WHERE dl.stage_notes='MOCK_SEED' AND dl.counselor_id=first_inst LIMIT 1;
  IF did IS NOT NULL AND second_c IS NOT NULL THEN
    INSERT INTO case_counselor_shares (deal_id, counselor_id, share_pct, requested_by, status) VALUES
      (did, first_inst, 60, first_inst, 'requested'), (did, second_c, 40, first_inst, 'requested');
  END IF;

  -- Salaries, an advance, owner ledger entries
  IF NOT EXISTS (SELECT 1 FROM salary_structures) THEN
  FOR c IN SELECT id FROM counselors WHERE role='counselor' AND COALESCE(status,'active')='active' LOOP
    WITH s AS (INSERT INTO salary_structures (counselor_id, basic) VALUES (c.id, 80000) RETURNING id)
    INSERT INTO salary_structure_lines (structure_id, label, line_type, calc, value)
      SELECT s.id, 'House allowance','earning','percent_of_basic',10 FROM s
      UNION ALL SELECT s.id, 'Transport','earning','fixed',5000 FROM s
      UNION ALL SELECT s.id, 'Income tax','deduction','percent_of_basic',5 FROM s;
  END LOOP;
  END IF; -- only seeds salaries when none exist yet
  IF second_c IS NOT NULL THEN
    INSERT INTO staff_advances (counselor_id, amount, purpose, status, approved_by) VALUES (second_c, 20000, 'MOCK advance', 'paid', first_inst);
  END IF;
  INSERT INTO owner_ledger_entries (category, description, amount) VALUES ('home','MOCK: utilities',15000),('personal','MOCK: travel',40000);
  RAISE NOTICE 'v2 mock data seeded';
END $$;
