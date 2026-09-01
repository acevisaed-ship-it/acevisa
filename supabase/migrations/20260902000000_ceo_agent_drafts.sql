-- Idea #1 MVP: CEO Agent draft-and-approve queue.
--
-- The agent NEVER writes directly to tasks/notifications/etc. It only ever
-- inserts a row here; nothing becomes real until the CEO approves it via
-- PATCH /api/agent-drafts/[id]. Mirrors the existing stage_suggestions
-- pattern (see 20260822040000_stage_suggestions.sql) generalized from
-- "propose a pipeline_stage change" to "propose any staff-facing task".
--
-- draft_type is deliberately open-ended (text, not an enum) so future
-- playbook rules can add new kinds of drafts without a migration — the
-- approval route decides how to materialize each type into a real write.
CREATE TABLE IF NOT EXISTS agent_task_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_type text NOT NULL DEFAULT 'task',
  -- Who the resulting task/action would be assigned to once approved.
  -- Nullable: some drafts (e.g. "review this counselor") are for the CEO's
  -- own attention and don't target anyone else.
  target_counselor_id uuid REFERENCES counselors(id) ON DELETE SET NULL,
  -- Optional client this draft relates to, for context/linking.
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  -- Which playbook rule produced this, e.g. 'retention_risk_review'. Lets
  -- the review UI group/filter and lets us trace every draft back to the
  -- exact rule that generated it (Idea #1's guardrail: nothing freelances
  -- outside a named, inspectable rule).
  source_rule text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES counselors(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_task_drafts_status ON agent_task_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_task_drafts_target ON agent_task_drafts (target_counselor_id);

-- Single-row ON/OFF switch for the CEO Agent's autonomous daily review
-- (Idea #1's explicit toggle requirement). When disabled, the daily cron
-- exits immediately without evaluating any playbook rule or writing any
-- draft. Seeded to a single fixed id so the app can always upsert/select it
-- without a lookup.
CREATE TABLE IF NOT EXISTS agent_settings (
  id text PRIMARY KEY DEFAULT 'ceo_agent',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES counselors(id)
);

INSERT INTO agent_settings (id, enabled)
VALUES ('ceo_agent', false)
ON CONFLICT (id) DO NOTHING;
