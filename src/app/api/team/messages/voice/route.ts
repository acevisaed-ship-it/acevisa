import { transcribeAudio } from '@/lib/transcribeAudio'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_BYTES = 5 * 1024 * 1024

async function getIdentity() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: counselor } = await admin.from('counselors').select('id, name').eq('email', user.email).single()
  return counselor ? { id: counselor.id, name: counselor.name } : null
}

export async function POST(request: Request) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const audio = formData.get('audio') as File | null
  const clientTranscript = (formData.get('transcript') as string | null)?.trim() || null
  if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Voice note too large (max 5 MB)' }, { status: 422 })

  const supabase = createAdminClient()
  const mimeType = (formData.get('mimeType') as string | null) || audio.type || 'audio/webm'
  const baseMimeType = mimeType.split(';')[0].trim()
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const timestamp = Date.now()
  const storagePath = `team-hub/${identity.id}/voice-${timestamp}.${ext}`
  const attachmentName = `voice-${timestamp}.${ext}`
  const bytes = await audio.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(storagePath, bytes, { contentType: baseMimeType, upsert: false })

  if (uploadError) {
    console.error('[team/messages/voice] storage error:', uploadError)
    return NextResponse.json({ error: 'Voice upload failed' }, { status: 500 })
  }

  const { data: signed } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const transcript = clientTranscript || (await transcribeAudio(bytes, baseMimeType, attachmentName))

  const initials = identity.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const { data: message, error: insertError } = await supabase
    .from('team_messages')
    .insert({
      sender_id: identity.id,
      sender_name: identity.name,
      sender_initials: initials,
      content: transcript || '[Voice note]',
      attachment_url: signed?.signedUrl ?? '',
      attachment_name: attachmentName,
      attachment_type: 'audio',
    })
    .select()
    .single()

  if (insertError) {
    console.error('[team/messages/voice] db error:', insertError)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  return NextResponse.json({ message })
}
