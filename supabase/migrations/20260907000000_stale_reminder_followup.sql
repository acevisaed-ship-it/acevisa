-- A reminder a counselor set for themselves (reminders.remind_at) that's
-- gone past its date without being resolved (status still 'pending') now
-- gets picked up automatically: a follow-up task is created for the
-- counselor, and the CEO is informed via a CEO Agent draft — see
-- checkStaleReminders() / /api/cron/stale-reminders.
--
-- escalated/escalated_at track which reminders have already been processed
-- so the daily cron doesn't re-flag the same one every run.
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_source_check
  CHECK (source IN ('manual', 'assigned', 'auto_followup', 'idle_followup', 'ceo_agent', 'reminder_followup'));
