-- Tracks who manually assigned a task (Admin or CEO). NULL = system-generated
-- (meeting requests, auto-booking) or self-created by the counselor.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES counselors(id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks (assigned_by);
