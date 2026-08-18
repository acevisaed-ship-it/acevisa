import { createAdminClient } from '@/lib/supabase/server'
import { isAiClientChatEnabled } from '@/lib/aiClientChat'
import { createNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'
import type { ChatAttachmentType } from '@/types'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIMES: Record<string, ChatAttachmentType> = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/zip': 'archive',
  'application/x-zip-compressed': 'archive',
  'application/x-rar-compressed': 'archive',
}

function ext(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip', 'application/x-zip-compressed': 'zip',
    'application/x-rar-compressed': 'rar',
  }
  return map[mime] ?? 'bin'
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const clientId = formData.get('clientId') as string | null
  const file = formData.get('file') as File | null

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  // Validate type
  const attachmentType = ALLOWED_MIMES[file.type]
  if (!attachmentType) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 422 })
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 422 })
  }

  const supabase = createAdminClient()

  // Verify client exists
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, counselor_id')
    .eq('id', clientId)
    .single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Upload to storage
  const timestamp = Date.now()
  const storagePath = `${clientId}/${timestamp}.${ext(file.type)}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[chat/upload] storage error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Generate 7-day signed URL
  const { data: signed } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const attachmentUrl = signed?.signedUrl ?? ''
  const attachmentName = file.name

  // Insert student message (the file)
  const { data: studentMsg } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      message_text: `[File: ${attachmentName}]`,
      sender: 'student',
      stage_tag: 'attachment',
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
    })
    .select('id, message_text, sender, timestamp, attachment_url, attachment_name, attachment_type')
    .single()

  // Insert AI acknowledgment only while client-facing AI replies are enabled
  let aiMsg = null
  if (isAiClientChatEnabled()) {
    const aiText = attachmentType === 'image'
      ? `Thanks for sharing that image! 📎 Your counselor will review it during your session. Is there anything specific you'd like to mention about it?`
      : `Got it — **${attachmentName}** has been received! 📄 It's been saved and your counselor will review it. Do you need to send any additional documents?`

    const { data } = await supabase
      .from('conversations')
      .insert({
        client_id: clientId,
        message_text: aiText,
        sender: 'ai',
        stage_tag: 'attachment_ack',
      })
      .select('id, message_text, sender, timestamp, attachment_url, attachment_name, attachment_type')
      .single()
    aiMsg = data
  } else if (client.counselor_id) {
    await createNotification({
      counselorId: client.counselor_id,
      type: 'chat_message',
      title: `New file — ${client.name}`,
      body: attachmentName,
      clientId,
    })
  }

  // Also add to documents table so counselor sees it in the checklist
  await supabase.from('documents').insert({
    client_id: clientId,
    document_name: attachmentName,
    status: 'uploaded',
    storage_path: storagePath,
    mime_type: file.type,
    file_size: file.size,
    uploaded_at: new Date().toISOString(),
  }).select().maybeSingle()
  // Non-fatal if documents table insert fails (e.g. column mismatch)

  return NextResponse.json({
    studentMessage: studentMsg,
    aiMessage: aiMsg,
    attachmentUrl,
    attachmentName,
    attachmentType,
  })
}
