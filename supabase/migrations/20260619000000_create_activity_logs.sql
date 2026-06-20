-- Create activity_logs table (was missing — only ALTER TABLE migrations existed before)
-- This is the canonical activity log for all counselor/admin actions on clients.

CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        REFERENCES clients(id) ON DELETE CASCADE,
  counselor_id uuid       REFERENCES counselors(id) ON DELETE SET NULL,
  action_type text        NOT NULL,
  description text        NOT NULL,
  visibility  text        NOT NULL DEFAULT 'internal', -- 'internal' | 'shared' (visible to student)
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_client    ON activity_logs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_counselor ON activity_logs (counselor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created   ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_shared    ON activity_logs (client_id, visibility, created_at DESC);

-- RLS: service-role key bypasses; anon/authenticated blocked
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_service_only" ON activity_logs
  USING (false) WITH CHECK (false);
