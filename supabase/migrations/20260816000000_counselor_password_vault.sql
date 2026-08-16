-- Encrypted last-admin-set staff login password, so CEO/admin can reveal it
-- from Team Management. This is NOT the live Auth hash — if the staff member
-- changes their own password, the vault row is cleared.
--
-- RLS enabled with no policies: only the service role (which bypasses RLS)
-- can read/write. Anon/authenticated are revoked.

CREATE TABLE IF NOT EXISTS counselor_password_vault (
  counselor_id uuid PRIMARY KEY REFERENCES counselors(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE counselor_password_vault ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE counselor_password_vault FROM PUBLIC, anon, authenticated;
