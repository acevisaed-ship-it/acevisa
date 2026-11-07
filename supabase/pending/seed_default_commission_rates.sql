-- Gives every active counselor without a commission rule an explicit 10% rate (the rate the screens already showed as a default),
-- keeps their existing base salary, then rebuilds incentive rows for every case.
-- Edit 10 below if your real default differs. Safe to run twice.
INSERT INTO commission_rules (counselor_id, commission_rate, base_salary)
SELECT c.id, 10, COALESCE(c.base_salary, 0)
FROM counselors c
WHERE c.role = 'counselor' AND COALESCE(c.status, 'active') = 'active'
  AND NOT EXISTS (SELECT 1 FROM commission_rules r WHERE r.counselor_id = c.id)
ON CONFLICT (counselor_id) DO NOTHING;

SELECT count(*) AS reconciled_cases FROM (SELECT ledger_reconcile(id, false, NULL) FROM deals) x;
