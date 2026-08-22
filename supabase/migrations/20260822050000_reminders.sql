-- Follow-up reminders: fully manual, optional, client-linked, with a
-- pending -> resolved lifecycle and an outcome note. Two entry points create
-- these (task-completion prompt + standing profile widget); both just POST
-- to the same table.

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  remind_at timestamptz NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  outcome text CHECK (outcome IN ('positive', 'negative', 'neutral')),
  outcome_note text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES counselors(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_client ON reminders (client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_counselor_status ON reminders (counselor_id, status);
