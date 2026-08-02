-- The chat-attachments bucket's allowed_mime_types never included audio, so every
-- voice note upload has been rejected by Supabase Storage itself (not app code) —
-- this is the actual cause of "Voice upload failed".
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'
]
WHERE id = 'chat-attachments';
