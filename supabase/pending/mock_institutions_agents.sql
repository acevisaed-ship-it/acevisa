-- Test data so the Institution / Agent dropdowns have something in them. Touches ONLY mock cases (deals.stage_notes = 'MOCK_SEED').
-- Safe to run twice. Undo with mock_institutions_agents_cleanup.sql.
INSERT INTO universities (country_id, name, short_code, is_partner)
SELECT c.id, v.name, v.code, v.partner
FROM (VALUES
  ('United Kingdom', 'MOCK University of Bradford', 'MUOB', true),
  ('United Kingdom', 'MOCK Nottingham Trent University', 'MNTU', true),
  ('United Kingdom', 'MOCK London Metropolitan University', 'MLMU', false),
  ('Australia', 'MOCK University of Melbourne', 'MUOM', true),
  ('Australia', 'MOCK Monash University', 'MMON', false),
  ('Canada', 'MOCK University of Toronto', 'MUOT', false)
) AS v(country, name, code, partner)
JOIN countries c ON c.name = v.country
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO agents (name) VALUES ('MOCK Global Edu'), ('MOCK StudyLink') ON CONFLICT (name) DO NOTHING;
INSERT INTO agent_institutions (agent_id, university_id)
SELECT a.id, u.id FROM agents a JOIN universities u ON u.name LIKE 'MOCK %' AND u.is_partner
WHERE a.name LIKE 'MOCK %' ON CONFLICT DO NOTHING;

-- Spread mock study cases across the mock institutions and agents (stable, by row order)
WITH mock AS (
  SELECT d.id, row_number() OVER (ORDER BY d.created_at, d.id) AS rn
  FROM deals d WHERE d.stage_notes = 'MOCK_SEED' AND d.university_id IS NULL
), unis AS (SELECT id, country_id, is_partner, row_number() OVER (ORDER BY name) AS un, count(*) OVER () AS total FROM universities WHERE name LIKE 'MOCK %'),
   ags AS (SELECT id, row_number() OVER (ORDER BY name) AS an, count(*) OVER () AS total FROM agents WHERE name LIKE 'MOCK %')
UPDATE deals d SET
  university_id = u.id, country_id = u.country_id, partner_at_application = u.is_partner,
  agent_id = CASE WHEN u.is_partner THEN a.id END,
  source_type = CASE WHEN u.is_partner THEN 'agent' WHEN m.rn % 3 = 0 THEN 'walk_in' WHEN m.rn % 3 = 1 THEN 'campaign' ELSE 'direct' END,
  applied_at = CURRENT_DATE - ((m.rn * 5) % 60)::int
FROM mock m
JOIN unis u ON u.un = ((m.rn - 1) % u.total) + 1
JOIN ags a ON a.an = ((m.rn - 1) % a.total) + 1
WHERE d.id = m.id;

SELECT count(*) AS mock_cases_with_institution FROM deals WHERE stage_notes = 'MOCK_SEED' AND university_id IS NOT NULL;
