import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
])

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const documentId = formData.get('documentId') as string | null
  const clientId = formData.get('clientId') as string | null

  if (!file || !documentId || !clientId) {
    return NextResponse.json({ error: 'file, documentId and clientId are required' }, { status: 400 })
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify the document belongs to this client
  const { data: doc } = await supabase
    .from('documents')
    .select('id, document_name')
    .eq('id', documentId)
    .eq('client_id', clientId)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${clientId}/${documentId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('client-documents')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Update document record
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      status: 'uploaded',
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  if (updateError) {
    console.error('Document update error:', updateError)
    return NextResponse.json({ error: 'Upload saved but record update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, storagePath })
}
