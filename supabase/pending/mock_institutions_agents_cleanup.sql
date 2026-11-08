-- Removes the mock institutions and agents and clears them from mock cases. Real cases are never touched.
UPDATE deals SET university_id = NULL, agent_id = NULL, partner_at_application = NULL, source_type = NULL
 WHERE stage_notes = 'MOCK_SEED' AND (university_id IN (SELECT id FROM universities WHERE name LIKE 'MOCK %') OR agent_id IN (SELECT id FROM agents WHERE name LIKE 'MOCK %'));
DELETE FROM agent_institutions WHERE agent_id IN (SELECT id FROM agents WHERE name LIKE 'MOCK %');
DELETE FROM agents WHERE name LIKE 'MOCK %';
DELETE FROM universities WHERE name LIKE 'MOCK %' AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.university_id = universities.id);
SELECT count(*) AS mock_institutions_left FROM universities WHERE name LIKE 'MOCK %';
