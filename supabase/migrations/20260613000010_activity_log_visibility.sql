-- Add visibility column to student_activity_log
-- 'internal' = counselor/admin only (default)
-- 'shared'   = visible to the client in their portal

ALTER TABLE student_activity_log
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal';

-- Index for fast student-facing queries
CREATE INDEX IF NOT EXISTS idx_activity_log_shared
  ON student_activity_log (client_id, visibility, created_at DESC);
