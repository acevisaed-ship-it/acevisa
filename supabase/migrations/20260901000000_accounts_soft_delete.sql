-- Soft-delete for financial entries so CEO can archive invoices/expenses
-- without destroying audit history. Lists, P&L, and exports exclude rows
-- where deleted_at IS NOT NULL.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES counselors(id);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES counselors(id);

CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices (deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses (deleted_at);
