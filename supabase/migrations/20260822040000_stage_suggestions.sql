-- AI-driven pipeline_stage changes must no longer write silently. This table
-- holds a proposed stage change pending counselor sign-off; nothing writes
-- to clients.pipeline_stage until a counselor approves it here.

CREATE TABLE IF NOT EXISTS stage_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  current_stage integer NOT NULL,
  suggested_stage integer NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES counselors(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_stage_suggestions_client ON stage_suggestions (client_id);
CREATE INDEX IF NOT EXISTS idx_stage_suggestions_pending ON stage_suggestions (client_id, status);
