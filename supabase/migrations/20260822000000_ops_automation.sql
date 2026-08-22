-- Ops automation: client removal, task source tagging, attendance automation flag.
-- Covers: admin/CEO client removal (soft delete), daily auto follow-up task tagging,
-- and system-flagged (vs manually recorded) attendance rows.

-- ─────────────────────────────────────────────────────────────────────────────
-- Clients: soft-delete ("removed") support
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES counselors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removed_reason text;

ALTER TABLE clients
  ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'suspended', 'removed'));

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tasks: distinguish system-generated daily follow-up tasks from manual/assigned
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_source_check
    CHECK (source IN ('manual', 'assigned', 'auto_followup'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks (client_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Attendance: mark which rows were system-generated (vs entered by HR/admin)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT false;
