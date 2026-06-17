import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  const formData = await request.formData()
  const clientId = formData.get('clientId') as string | null
  const audio = formData.get('audio') as File | null

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Voice note too large (max 5 MB)' }, { status: 422 })

  const supabase = createAdminClient()

  // Verify client
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Use the actual mimeType sent by the client (varies by browser/device)
  const mimeType = (formData.get('mimeType') as string | null) || audio.type || 'audio/webm'
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'

  // Upload audio blob to Supabase storage
  const timestamp = Date.now()
  const storagePath = `${clientId}/voice-${timestamp}.${ext}`
  const bytes = await audio.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.error('[chat/voice] storage error:', uploadError)
    return NextResponse.json({ error: 'Voice upload failed' }, { status: 500 })
  }

  // Generate 7-day signed URL for playback
  const { data: signed } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const audioUrl = signed?.signedUrl ?? ''

  // Save student voice message — audio bubble, no transcription
  const { data: studentMsg } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      message_text: '[Voice note]',
      sender: 'student',
      stage_tag: 'voice_note',
      attachment_url: audioUrl,
      attachment_name: `voice-${timestamp}.${ext}`,
      attachment_type: 'audio',
    })
    .select('id, message_text, sender, timestamp, attachment_url, attachment_name, attachment_type')
    .single()

  // AI acknowledgment — generic since we have no transcript
  const { data: aiMsg } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      message_text: "I received your voice note! 🎙️ Your counselor will listen to it during your session. If you'd like me to respond now, feel free to type your question and I'll answer right away.",
      sender: 'ai',
      stage_tag: 'voice_response',
    })
    .select('id, message_text, sender, timestamp, attachment_url, attachment_name, attachment_type')
    .single()

  return NextResponse.json({
    studentMessage: studentMsg,
    aiMessage: aiMsg,
    audioUrl,
  })
}
