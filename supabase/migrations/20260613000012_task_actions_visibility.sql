-- Add visibility column to task_actions
-- Determines whether a counselor note on a task is also shared with the client
ALTER TABLE task_actions
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal';
