-- Walk-in intake fields captured by reception at registration.
-- Scalar columns for required/conditional facts; jsonb arrays for repeatable history.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS last_education text,
  ADD COLUMN IF NOT EXISTS education_percentage numeric,
  ADD COLUMN IF NOT EXISTS education_completion_year integer,
  ADD COLUMN IF NOT EXISTS travel_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visa_rejection_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS language_test_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS budget text;
