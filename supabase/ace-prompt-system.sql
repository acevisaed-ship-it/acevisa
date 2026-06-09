-- ACE prompt system: ai_profiles tracking columns + specialist_outputs table

ALTER TABLE ai_profiles
  ADD COLUMN IF NOT EXISTS stage integer,
  ADD COLUMN IF NOT EXISTS qualification_score integer,
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS detected_region text,
  ADD COLUMN IF NOT EXISTS detected_fears jsonb,
  ADD COLUMN IF NOT EXISTS detected_behaviour_type text,
  ADD COLUMN IF NOT EXISTS service_match text,
  ADD COLUMN IF NOT EXISTS last_updated timestamptz;

CREATE TABLE IF NOT EXISTS specialist_outputs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  specialist_type text NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specialist_outputs_client_id ON specialist_outputs(client_id);
