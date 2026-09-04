-- profile_update_requests.reviewed_fields was in the original table
-- definition (supabase/profile_update_requests.sql) but never applied
-- when the table was created in production.
ALTER TABLE profile_update_requests
  ADD COLUMN IF NOT EXISTS reviewed_fields jsonb DEFAULT '{}';
