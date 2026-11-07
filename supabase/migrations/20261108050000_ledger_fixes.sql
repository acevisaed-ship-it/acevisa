-- Make "latest clearance" unambiguous even when a clear and a revoke happen in one transaction.
ALTER TABLE case_clearance ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE incentives ALTER COLUMN created_at SET DEFAULT clock_timestamp();
