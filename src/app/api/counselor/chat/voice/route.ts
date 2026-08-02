import { transcribeAudio } from '@/lib/transcribeAudio'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const clientId = formData.get('clientId') as string | null
  const audio = formData.get('audio') as File | null

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Voice note too large (max 5 MB)' }, { status: 422 })

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('language')
    .eq('id', clientId)
    .single()

  const mimeType = (formData.get('mimeType') as string | null) || audio.type || 'audio/webm'
  const baseMimeType = mimeType.split(';')[0].trim()
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const timestamp = Date.now()
  const storagePath = `${clientId}/voice-${timestamp}.${ext}`
  const attachmentName = `voice-${timestamp}.${ext}`
  const bytes = await audio.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(storagePath, bytes, { contentType: baseMimeType, upsert: false })

  if (uploadError) {
    console.error('[counselor/chat/voice] storage error:', uploadError)
    return NextResponse.json({ error: 'Voice upload failed' }, { status: 500 })
  }

  const { data: signed } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const transcript = await transcribeAudio(bytes, baseMimeType, attachmentName, client?.language)

  const { data: message, error: insertError } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      sender: 'counselor',
      counselor_name: counselor.name,
      message_text: transcript ?? '[Voice note]',
      stage_tag: 'voice_note',
      attachment_url: signed?.signedUrl ?? '',
      attachment_name: attachmentName,
      attachment_type: 'audio',
      timestamp: new Date().toISOString(),
    })
    .select('id, message_text, sender, counselor_name, timestamp, attachment_url, attachment_name, attachment_type')
    .single()

  if (insertError) {
    console.error('[counselor/chat/voice] db error:', insertError)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  return NextResponse.json({ message })
}
