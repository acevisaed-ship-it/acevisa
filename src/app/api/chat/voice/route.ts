import { transcribeAudio } from '@/lib/transcribeAudio'
import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'
import type { ChatMessage } from '@/types'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  const formData = await request.formData()
  const clientId = formData.get('clientId') as string | null
  const audio = formData.get('audio') as File | null
  const clientTranscript = (formData.get('transcript') as string | null)?.trim() || null

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Voice note too large (max 5 MB)' }, { status: 422 })

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, language, counselor_active')
    .eq('id', clientId)
    .single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const mimeType = (formData.get('mimeType') as string | null) || audio.type || 'audio/webm'
  const baseMimeType = mimeType.split(';')[0].trim()
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'

  const timestamp = Date.now()
  const storagePath = `${clientId}/voice-${timestamp}.${ext}`
  const bytes = await audio.arrayBuffer()
  const attachmentName = `voice-${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(storagePath, bytes, { contentType: baseMimeType, upsert: false })

  if (uploadError) {
    console.error('[chat/voice] storage error:', uploadError)
    return NextResponse.json({ error: 'Voice upload failed' }, { status: 500 })
  }

  const { data: signed } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const audioUrl = signed?.signedUrl ?? ''
  const transcript =
    clientTranscript ||
    (await transcribeAudio(bytes, baseMimeType, attachmentName, client.language))
  const messageText = transcript ?? '[Voice note]'

  const { data: studentMsg } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      message_text: messageText,
      sender: 'student',
      stage_tag: 'voice_note',
      attachment_url: audioUrl,
      attachment_name: attachmentName,
      attachment_type: 'audio',
    })
    .select('id, message_text, sender, timestamp, attachment_url, attachment_name, attachment_type')
    .single()

  if (client.counselor_active) {
    return NextResponse.json({
      studentMessage: studentMsg,
      aiMessage: null,
      audioUrl,
      transcript,
    })
  }

  if (!transcript) {
    const fallbackText =
      "I received your voice note but couldn't make out the words clearly. Could you type your question and I'll answer right away?"

    const { data: aiMsg } = await supabase
      .from('conversations')
      .insert({
        client_id: clientId,
        message_text: fallbackText,
        sender: 'ai',
        stage_tag: 'voice_response',
      })
      .select('id, message_text, sender, timestamp, attachment_url, attachment_name, attachment_type')
      .single()

    return NextResponse.json({
      studentMessage: studentMsg,
      aiMessage: aiMsg,
      audioUrl,
      transcript: null,
    })
  }

  try {
    const chatRes = await fetch(`${getBaseUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, message: transcript, voiceNoteAlreadySaved: true }),
    })

    const chatData = await chatRes.json()

    if (!chatRes.ok) {
      console.error('[chat/voice] AI chat error:', chatData)
      return NextResponse.json({ error: 'AI response failed' }, { status: 500 })
    }

    const aiMessage: ChatMessage | null = chatData.message
      ? {
          id: crypto.randomUUID(),
          sender: 'ai',
          message_text: chatData.message,
          timestamp: new Date().toISOString(),
        }
      : null

    return NextResponse.json({
      studentMessage: studentMsg,
      aiMessage,
      audioUrl,
      transcript,
    })
  } catch (err) {
    console.error('[chat/voice] AI chat fetch failed:', err)
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 })
  }
}
