CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  program_name text,
  country text,
  status text NOT NULL DEFAULT 'preparing',
  application_reference text,
  submitted_date date,
  decision_date date,
  created_by uuid REFERENCES counselors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_client ON applications (client_id);

-- Status-change history + free-text updates, visible to the student only when 'shared'.
CREATE TABLE IF NOT EXISTS application_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status text,
  note text,
  visibility text NOT NULL DEFAULT 'shared',
  created_by uuid REFERENCES counselors(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_application_updates_app ON application_updates (application_id, created_at DESC);
