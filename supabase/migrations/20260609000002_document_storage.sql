-- Storage bucket for client documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated uploads (service role only — enforced at API layer)
CREATE POLICY "service_role_all" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'client-documents');

-- Add storage_path column to documents table so we can link to uploaded files
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;
