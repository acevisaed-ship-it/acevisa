-- Client assignment / transfer tracking — run in Supabase SQL Editor

ALTER TABLE clients ADD COLUMN IF NOT EXISTS previous_counselor_id uuid REFERENCES counselors(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES counselors(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_previous_counselor_id ON clients(previous_counselor_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_by ON clients(assigned_by);
