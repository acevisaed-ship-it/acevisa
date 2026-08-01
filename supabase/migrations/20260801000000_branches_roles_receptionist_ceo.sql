-- Branches, new staff roles (receptionist, ceo), and human-readable client IDs.
--
-- Role model after this migration (counselors.role — free text, no CHECK constraint):
--   'ceo'          — Super Admin. branch_id stays NULL. Sees everything, all branches, all roles.
--   'admin'        — Branch Manager. branch_id set. Scoped to their own branch (core entities only — see app code).
--   'counselor'    — unchanged. branch_id set, scoped via existing counselor_id assignment + branch.
--   'receptionist' — branch_id set. Only allowed action: register a new client (see /api/receptionist/register-client).
--
-- Run this in the Supabase SQL editor (or `supabase db push`) BEFORE deploying app code that
-- depends on these columns.

-- 1. Branches -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  code        text UNIQUE,
  address     text,
  phone       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed one default branch so existing staff/clients have somewhere to land.
INSERT INTO branches (name, code)
  SELECT 'Main Branch', 'MAIN'
  WHERE NOT EXISTS (SELECT 1 FROM branches);

-- 2. counselors.branch_id ------------------------------------------------------
ALTER TABLE counselors
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

UPDATE counselors
SET branch_id = (SELECT id FROM branches ORDER BY created_at LIMIT 1)
WHERE branch_id IS NULL
  AND role IS DISTINCT FROM 'ceo';

-- 3. clients.branch_id ----------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

UPDATE clients
SET branch_id = (SELECT id FROM branches ORDER BY created_at LIMIT 1)
WHERE branch_id IS NULL;

-- 4. clients.client_code — human-readable ID: AV-000001, AV-000002, ... --------
CREATE SEQUENCE IF NOT EXISTS client_code_seq;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_code text;

-- Backfill existing clients (registration order) before enforcing NOT NULL/UNIQUE.
WITH ordered AS (
  SELECT id FROM clients WHERE client_code IS NULL ORDER BY created_at
)
UPDATE clients c
SET client_code = 'AV-' || lpad(nextval('client_code_seq')::text, 6, '0')
FROM ordered o
WHERE c.id = o.id;

ALTER TABLE clients
  ALTER COLUMN client_code SET DEFAULT ('AV-' || lpad(nextval('client_code_seq')::text, 6, '0'));

ALTER TABLE clients
  ALTER COLUMN client_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_code ON clients (client_code);
CREATE INDEX IF NOT EXISTS idx_clients_branch ON clients (branch_id);
CREATE INDEX IF NOT EXISTS idx_counselors_branch ON counselors (branch_id);

-- 5. Track who registered a client directly (receptionist/counselor), vs NULL = self-registered via AI chat / public form.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES counselors(id);

-- 6. activity_logs: denormalize actor role so the CEO's global feed can filter/query fast
-- without joining counselors on every read. client_id was already nullable — staff-only
-- events (login, account creation, settings changes) can log with client_id = NULL.
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS actor_role text;

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_role ON activity_logs (actor_role, created_at DESC);

-- 7. campaigns.branch_id — branch-owned ad sources --------------------------------
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

UPDATE campaigns
SET branch_id = (SELECT id FROM branches ORDER BY created_at LIMIT 1)
WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_branch ON campaigns (branch_id);
