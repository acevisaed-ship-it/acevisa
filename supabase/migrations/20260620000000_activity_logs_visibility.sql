-- Consolidate activity logging on activity_logs (visibility for student-facing feed)
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal';

CREATE INDEX IF NOT EXISTS idx_activity_logs_shared
  ON activity_logs (client_id, visibility, created_at DESC);
