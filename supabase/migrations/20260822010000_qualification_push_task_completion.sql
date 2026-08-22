-- Manual lead qualification, completed-task timestamps, and push notification
-- subscriptions.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tasks: track when a task was actually completed (for "done today" views)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks (counselor_id, completed_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Clients: manual qualification by the counselor, independent of the AI score.
-- qualification_factors holds counselor-entered key/value criteria, e.g.
-- [{"label": "Budget confirmed", "value": "Yes, 20k USD"}, ...] — free-form so
-- each counselor can capture whatever factors matter for that lead.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS manually_qualified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manually_qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS manually_qualified_by uuid REFERENCES counselors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qualification_factors jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- Push notification subscriptions (Web Push) — lets the notification bell
-- reach a counselor/admin even when the tab/browser is closed or minimized.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_counselor ON push_subscriptions (counselor_id);
