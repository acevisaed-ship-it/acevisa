-- Idle-detection task engine, per-counselor attendance shifts, and task
-- urgency/milestone/escalation support. Covers the CEO's redesign of daily
-- task automation: replace the blanket daily SOP task with idle-client
-- detection, a 48h/2-working-day negligence grace period, an auto-computed
-- urgency taxonomy with a manual milestone override, per-counselor shift
-- times with a 15-minute late grace period, and idle-task escalation to
-- the CEO when a counselor doesn't act on it.

-- ─────────────────────────────────────────────────────────────────────────────
-- Counselors: per-counselor shift schedule (was a single global 11am cutoff)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE counselors
  ADD COLUMN IF NOT EXISTS shift_start_time time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS shift_end_time   time NOT NULL DEFAULT '17:00',
  -- 0=Sunday..6=Saturday (JS/Postgres EXTRACT(DOW) convention). Default
  -- Mon-Sat, matching the existing agency-wide Sunday-off assumption
  -- (isSundayPKT) so nobody's schedule silently changes on migration.
  ADD COLUMN IF NOT EXISTS working_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6}';

-- ─────────────────────────────────────────────────────────────────────────────
-- Clients: idle-clock tracking + snooze (pauses the idle clock for a
-- legitimate reason, e.g. "waiting on embassy 3 weeks")
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS last_counselor_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS idle_snooze_until date,
  ADD COLUMN IF NOT EXISTS idle_snoozed_by uuid REFERENCES counselors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idle_snooze_reason text;

CREATE INDEX IF NOT EXISTS idx_clients_last_activity ON clients (last_counselor_activity_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tasks: negligence_flagged is used throughout the codebase (HR Flags,
-- notifications, cron) but was never actually migrated anywhere in this
-- repo — added defensively here (IF NOT EXISTS is a no-op if it was created
-- directly in the Supabase dashboard at some point). Also adds the
-- milestone override and escalation tracking for idle-detection tasks.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS negligence_flagged boolean NOT NULL DEFAULT false,
  -- Manual "this is tied to a case stage, not a date" override — when true,
  -- the auto-computed due-date urgency is ignored in favor of the
  -- milestone bucket. milestone_stage is optional context (which pipeline
  -- stage it's waiting on) — informational only in this pass, not
  -- auto-closing.
  ADD COLUMN IF NOT EXISTS is_milestone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_stage integer,
  -- Set when an idle-detection follow-up task itself goes unactioned for
  -- another working day and gets escalated to the CEO (distinct from
  -- negligence_flagged, which drives HR Flags generally).
  ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_negligence_open ON tasks (negligence_flagged) WHERE negligence_flagged = false;

-- Widen the source vocabulary: 'ceo_agent' was already used by the CEO
-- Agent approval flow (src/app/api/agent-drafts/[id]/route.ts) but was
-- never actually allowed by this constraint — every one of those inserts
-- has been silently violating it. 'idle_followup' replaces 'auto_followup'
-- going forward; the old value stays valid so historical rows still read.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_source_check
  CHECK (source IN ('manual', 'assigned', 'auto_followup', 'idle_followup', 'ceo_agent'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: seed last_counselor_activity_at from each client's most recent
-- counselor-authored activity_logs row (falling back to the column default
-- of now() already applied above for clients with no such row), so the
-- idle clock doesn't treat the entire existing client base as freshly
-- touched the moment this ships.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE clients c
SET last_counselor_activity_at = latest.created_at
FROM (
  SELECT DISTINCT ON (al.client_id) al.client_id, al.created_at
  FROM activity_logs al
  JOIN clients cl ON cl.id = al.client_id
  WHERE al.counselor_id = cl.counselor_id
    AND al.actor_role IS NOT NULL
    AND al.actor_role != 'system'
  ORDER BY al.client_id, al.created_at DESC
) latest
WHERE c.id = latest.client_id;
