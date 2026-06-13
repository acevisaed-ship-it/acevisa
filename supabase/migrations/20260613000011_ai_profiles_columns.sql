-- Add individual AI-detected columns to ai_profiles
-- These are written on every chat message (upsertInternalProfile)
-- profile_json is only written after a full conversation completes

ALTER TABLE ai_profiles
  ADD COLUMN IF NOT EXISTS stage integer,
  ADD COLUMN IF NOT EXISTS qualification_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS detected_region text,
  ADD COLUMN IF NOT EXISTS detected_fears jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS detected_behaviour_type text,
  ADD COLUMN IF NOT EXISTS service_match text,
  ADD COLUMN IF NOT EXISTS last_updated timestamptz DEFAULT now();
