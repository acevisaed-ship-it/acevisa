-- Canonicalize tasks.status to a single, enforced vocabulary. The codebase
-- had drifted into two inconsistent sets ('pending'/'completed' in some
-- routes, 'pending'/'in_progress'/'done' in others) with no DB constraint —
-- meaning a task completed via one flow could be invisible in another view.
--
-- New canonical set: open -> in_progress -> completed -> closed.
-- "Completed" = the counselor's work is done. "Closed" = verified/signed
-- off (manually by counselor/admin, or auto-suggested when a linked
-- follow-up reminder resolves positively — see the reminders migration).

-- Fold every legacy/unexpected value into the new vocabulary before adding
-- the constraint, so the ALTER never fails against existing rows.
UPDATE tasks SET status = 'open' WHERE status = 'pending';
UPDATE tasks SET status = 'completed' WHERE status = 'done';
UPDATE tasks
  SET status = 'open'
  WHERE status IS NULL OR status NOT IN ('open', 'in_progress', 'completed', 'closed');

ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'open';

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('open', 'in_progress', 'completed', 'closed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Who/when closed a task — mirrors the manually_qualified_by pattern already
-- used on clients, so a Close action always has an accountable actor.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES counselors(id) ON DELETE SET NULL;
