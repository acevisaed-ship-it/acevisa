-- Idea: a counselor can request marking a client's pipeline inactive (or
-- reactivating one that's already inactive) — CEO-only approval. This is a
-- separate flag layered on top of the existing 1-7 pipeline_stage, not a new
-- stage value, so nothing about existing stage logic (board views, progress
-- bars, stage_suggestions) needs to change.
--
-- Modeled on client_correction_requests (request -> review -> resolved), but
-- deliberately its own table rather than reusing that one: corrections are a
-- receptionist-only workflow reviewable by admin-or-CEO, while this is
-- counselor-initiated and CEO-only to approve — different actors on both
-- ends, so folding it into the receptionist table would mean re-plumbing its
-- role checks and risking that working flow.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pipeline_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS client_inactive_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES counselors(id),
  branch_id uuid REFERENCES branches(id),
  -- What the requester is asking pipeline_active to become: false = mark
  -- inactive, true = reactivate. Bidirectional so the same table/UI covers
  -- both directions without a second migration later.
  requested_active boolean NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES counselors(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cir_status_branch
  ON client_inactive_requests(status, branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cir_client
  ON client_inactive_requests(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cir_requested_by
  ON client_inactive_requests(requested_by, created_at DESC);
