-- Columns used by the public registration form (POST /api/register)

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS interested_in text,
  ADD COLUMN IF NOT EXISTS target_country text;
