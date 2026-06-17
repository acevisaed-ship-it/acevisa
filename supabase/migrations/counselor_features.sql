-- ─────────────────────────────────────────────────
-- Counselor features migration
-- Run this in Supabase SQL editor
-- ─────────────────────────────────────────────────

-- 1. Allow counselor as a conversation sender
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_sender_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_sender_check
  CHECK (sender IN ('ai', 'student', 'counselor'));

-- 2. Store counselor name on counselor-sent messages
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS counselor_name TEXT;

-- 3. Flag to mute AI while counselor is live in chat
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS counselor_active BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Counselor objectives — goals the AI pursues autonomously
CREATE TABLE IF NOT EXISTS counselor_objectives (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  objective_text  TEXT    NOT NULL,
  plan_text   TEXT,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS counselor_objectives_client_status
  ON counselor_objectives (client_id, status);
