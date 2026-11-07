-- Run BEFORE mock_test_data_cleanup.sql. Removes v2 mock rows (audit_events untouched).
DO $$
DECLARE cids uuid[]; dids uuid[];
BEGIN
  SELECT array_agg(id) INTO cids FROM clients WHERE notes='MOCK_SEED';
  SELECT array_agg(id) INTO dids FROM deals WHERE client_id = ANY(cids);
  DELETE FROM service_charges WHERE deal_id = ANY(dids);
  DELETE FROM test_sessions WHERE language_test_id IN (SELECT id FROM language_tests WHERE client_id = ANY(cids));
  DELETE FROM instructor_incentives WHERE test_session_id NOT IN (SELECT id FROM test_sessions);
  DELETE FROM refunds WHERE client_id = ANY(cids);
  DELETE FROM language_tests WHERE client_id = ANY(cids);
  DELETE FROM vouchers WHERE client_id = ANY(cids);
  DELETE FROM case_stages WHERE deal_id = ANY(dids);
  DELETE FROM case_checklist_items WHERE deal_id = ANY(dids);
  DELETE FROM attestation_items WHERE deal_id = ANY(dids);
  DELETE FROM visit_visa_cases WHERE deal_id = ANY(dids);
  DELETE FROM case_counselor_shares WHERE deal_id = ANY(dids);
  UPDATE deals SET checklist_template_id = NULL WHERE id = ANY(dids);
  DELETE FROM checklist_template_items WHERE template_id IN (SELECT id FROM checklist_templates WHERE version = 901);
  DELETE FROM checklist_templates WHERE version = 901;
  DELETE FROM attestation_requirements WHERE version = 901;
  DELETE FROM universities WHERE name LIKE 'TEST %';
  DELETE FROM instructor_commission_plans WHERE instructor_id IN (SELECT counselor_id FROM staff_capabilities);
  DELETE FROM staff_capabilities WHERE capability = 'instructor' AND counselor_id IN (SELECT id FROM counselors WHERE role='counselor');
  DELETE FROM salary_structure_lines WHERE structure_id IN (SELECT id FROM salary_structures);
  DELETE FROM salary_structures WHERE created_by IS NULL AND basic = 80000;
  DELETE FROM staff_advances WHERE purpose = 'MOCK advance';
  DELETE FROM owner_ledger_entries WHERE description LIKE 'MOCK:%';
END $$;
-- WARNING: the salary_structures / staff_capabilities deletes above assume no real rows exist yet. Review before running once real data is added.
