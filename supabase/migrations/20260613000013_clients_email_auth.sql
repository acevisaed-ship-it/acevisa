-- Student portal auth columns
-- email: captured at registration, used for Supabase Auth invite + login
-- auth_user_id: Supabase auth.users.id linked to this client
-- portal_password_set: false until student completes first-time setup

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS portal_password_set boolean NOT NULL DEFAULT false;

-- Unique index on email (allow null for clients registered before this migration)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email
  ON clients (email) WHERE email IS NOT NULL;

-- Index for auth_user_id lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_auth_user_id
  ON clients (auth_user_id) WHERE auth_user_id IS NOT NULL;
