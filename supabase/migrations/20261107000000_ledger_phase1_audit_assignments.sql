-- Ledger Phase 1a: append-only audit trail + client assignment history.
-- Additive. RLS on, no anon/authenticated grants. NOT YET APPLIED.
-- Apply with: npx.cmd supabase db query --linked --file <this file>   (never `db push`)

CREATE TABLE IF NOT EXISTS audit_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES counselors(id),
  actor_role   text,
  branch_id    uuid,
  entity_type  text NOT NULL,
  entity_id    uuid,
  action       text NOT NULL,
  before_data  jsonb,
  after_data   jsonb,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_branch ON audit_events (branch_id, created_at DESC);

CREATE OR REPLACE FUNCTION audit_events_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_events_no_update ON audit_events;
CREATE TRIGGER trg_audit_events_no_update
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_block_mutation();

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_events FROM anon, authenticated;

-- Who held the client, and when (milestone credit depends on this).
CREATE TABLE IF NOT EXISTS client_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  counselor_id  uuid REFERENCES counselors(id),
  assigned_by   uuid REFERENCES counselors(id),
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  reason        text
);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON client_assignments (client_id, assigned_at DESC);
-- At most one open holder per client.
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_assignments_open
  ON client_assignments (client_id) WHERE ended_at IS NULL;

-- Backfill: one open row per client from the current holder (idempotent).
INSERT INTO client_assignments (client_id, counselor_id, assigned_at, reason)
SELECT c.id, c.counselor_id, COALESCE(c.created_at, now()), 'backfill from clients.counselor_id'
FROM clients c
WHERE c.counselor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM client_assignments a WHERE a.client_id = c.id);

ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON client_assignments FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
