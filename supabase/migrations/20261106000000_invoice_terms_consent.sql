-- Invoice terms consent: versioned terms/policies, hashed acceptance tokens,
-- snapshot on issue, and awaiting_consent before an invoice is sent.
-- RLS on, service-role only. Old published versions are never edited or deleted.

-- ─── terms_documents ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terms_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('general', 'product')),
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  title text NOT NULL,
  body text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  published_by uuid REFERENCES counselors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT terms_documents_product_scope CHECK (
    (scope = 'general' AND product_id IS NULL)
    OR (scope = 'product' AND product_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS terms_documents_one_active_general
  ON terms_documents (scope)
  WHERE is_active AND scope = 'general';

CREATE UNIQUE INDEX IF NOT EXISTS terms_documents_one_active_product
  ON terms_documents (product_id)
  WHERE is_active AND scope = 'product';

CREATE INDEX IF NOT EXISTS idx_terms_documents_product_id ON terms_documents (product_id);
CREATE INDEX IF NOT EXISTS idx_terms_documents_scope_version ON terms_documents (scope, product_id, version DESC);

ALTER TABLE terms_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE terms_documents FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION terms_documents_protect_published()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'Published terms cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.published_at IS NOT NULL THEN
    IF NEW.body IS DISTINCT FROM OLD.body
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.version IS DISTINCT FROM OLD.version
      OR NEW.scope IS DISTINCT FROM OLD.scope
      OR NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      RAISE EXCEPTION 'Published terms cannot be edited';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_terms_documents_protect_published ON terms_documents;
CREATE TRIGGER trg_terms_documents_protect_published
  BEFORE UPDATE OR DELETE ON terms_documents
  FOR EACH ROW
  EXECUTE PROCEDURE terms_documents_protect_published();

-- ─── invoice_consents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  general_terms_id uuid NOT NULL REFERENCES terms_documents(id) ON DELETE RESTRICT,
  product_terms_id uuid NOT NULL REFERENCES terms_documents(id) ON DELETE RESTRICT,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'agreed', 'expired', 'revoked')),
  requested_by uuid REFERENCES counselors(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  agreed_at timestamptz,
  agreed_ip text,
  agreed_user_agent text,
  agreed_name_typed text,
  reminder_sent_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS invoice_consents_token_hash_key ON invoice_consents (token_hash);
CREATE INDEX IF NOT EXISTS idx_invoice_consents_client_product ON invoice_consents (client_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_consents_pending_expiry ON invoice_consents (status, expires_at);

ALTER TABLE invoice_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE invoice_consents FROM PUBLIC, anon, authenticated;

-- Rate-limit rows for the public acceptance POST (IP hashed).
CREATE TABLE IF NOT EXISTS invoice_consent_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_consent_rate_limits_ip_time
  ON invoice_consent_rate_limits (ip_hash, attempted_at DESC);

ALTER TABLE invoice_consent_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE invoice_consent_rate_limits FROM PUBLIC, anon, authenticated;

-- ─── invoices columns ─────────────────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS consent_id uuid REFERENCES invoice_consents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terms_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invoices_consent_id ON invoices (consent_id);

-- ─── Seed unpublished drafts (not legal wording) ──────────────────────────────
INSERT INTO terms_documents (scope, product_id, title, body, version, is_active)
SELECT
  'general',
  NULL,
  'Terms of Service',
  $draft$DRAFT - PENDING OWNER AND LEGAL REVIEW

This document is a structural placeholder. It is not legal advice and must be replaced with owner- and lawyer-approved terms of service before any production invoice is sent.

1. Parties and services
[Owner to supply]

2. Fees and payment
[Owner to supply]

3. Client responsibilities
[Owner to supply]

4. Limitation of liability
[Owner to supply]

5. Governing law
[Owner to supply]
$draft$,
  1,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM terms_documents t WHERE t.scope = 'general'
);

INSERT INTO terms_documents (scope, product_id, title, body, version, is_active)
SELECT
  'product',
  p.id,
  p.name || ' — service policy',
  'DRAFT - PENDING OWNER AND LEGAL REVIEW' || E'\n\n'
    || 'This policy is a structural placeholder for ' || p.name
    || '. It is not legal advice and must be replaced with owner- and lawyer-approved wording before production use.'
    || E'\n\nRefund policy: [Owner to supply]'
    || E'\nService scope: [Owner to supply]'
    || E'\nTimelines: [Owner to supply]'
    || E'\nWhat is and is not included: [Owner to supply]',
  1,
  false
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM terms_documents t WHERE t.scope = 'product' AND t.product_id = p.id
);
