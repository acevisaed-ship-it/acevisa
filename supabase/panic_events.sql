-- Panic detection events — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS panic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  trigger_message text NOT NULL,
  trigger_keywords text[] NOT NULL,
  status text DEFAULT 'open',
  counselor_notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panic_events_client_id ON panic_events(client_id);
CREATE INDEX IF NOT EXISTS idx_panic_events_status ON panic_events(status);
