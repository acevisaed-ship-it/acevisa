-- CEO-only knowledge base: country presentation decks + visa guidebooks.
-- Distinct from the existing `knowledge_base` table (short Q&A text entries,
-- readable by admin AND ceo). This table stores uploaded HTML/PDF documents
-- and is intended to be visible to the 'ceo' role only -- enforced at the
-- Next.js API layer via requireCeoApi()/requireCeo(), same pattern as
-- src/app/(admin)/admin/branches.

CREATE TABLE IF NOT EXISTS ceo_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Country Deck', -- 'Country Deck' | 'Visa Guidebook'
  country text,
  description text,
  storage_path text NOT NULL UNIQUE,
  file_size integer,
  mime_type text,
  added_by uuid REFERENCES counselors(id),
  added_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_ceo_knowledge_documents_category
  ON ceo_knowledge_documents(category);

-- RLS: no counselors.id <-> auth.uid() mapping exists in this schema (the
-- app authenticates counselors by email, not by auth_user_id -- see
-- getAuthenticatedCounselor() in src/lib/supabase/server.ts), so a
-- role-aware Postgres policy can't be written reliably here. Instead, block
-- all direct client access unconditionally (service_role only) and enforce
-- the 'ceo' check entirely at the API/page layer, matching the existing
-- client-documents / chat-attachments storage policies in this project.
ALTER TABLE ceo_knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON ceo_knowledge_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Private storage bucket for the actual files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ceo-knowledge-base',
  'ceo-knowledge-base',
  false,
  10485760, -- 10 MB
  ARRAY['text/html', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Same convention as client-documents / chat-attachments: service_role only,
-- no anon/authenticated policy at all. Reads happen through
-- GET /api/admin/ceo-knowledge-base/[id]/view, which is gated by
-- requireCeoApi() and generates a short-lived signed URL server-side.
-- Policy name must be unique -- storage.objects is shared across every
-- bucket, and "service_role_all" is already taken there by the
-- client-documents bucket's policy (20260609000002_document_storage.sql).
CREATE POLICY "service_role_all_ceo_knowledge_base" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'ceo-knowledge-base')
  WITH CHECK (bucket_id = 'ceo-knowledge-base');
