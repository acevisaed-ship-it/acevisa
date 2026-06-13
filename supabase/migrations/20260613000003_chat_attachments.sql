-- Chat attachments — run in Supabase SQL Editor

-- 1. Add attachment columns to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS attachment_url   TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type  TEXT; -- 'image' | 'pdf' | 'document' | 'archive'

-- 2. Create chat-attachments storage bucket (private, signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760, -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy — service role can read/write (API uses service role key)
CREATE POLICY "Service role full access on chat-attachments"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'chat-attachments')
  WITH CHECK (bucket_id = 'chat-attachments');
