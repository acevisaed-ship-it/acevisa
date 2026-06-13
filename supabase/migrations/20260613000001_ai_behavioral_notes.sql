-- AI Behavioral Notes — versioned per-client analysis with training data storage
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_behavioral_notes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  analyzed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count           INTEGER NOT NULL,
  messages_since_last     INTEGER NOT NULL DEFAULT 0,
  psychological_read      JSONB,
  behavioral_observations TEXT[],
  delta_from_last         TEXT,
  risk_flags              TEXT[],
  training_data           JSONB,
  profile_snapshot        JSONB,
  model                   TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001'
);

CREATE INDEX IF NOT EXISTS idx_behavioral_notes_client
  ON ai_behavioral_notes(client_id, analyzed_at DESC);
