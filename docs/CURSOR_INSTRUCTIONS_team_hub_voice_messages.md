# Cursor instructions: voice messages in Team Hub (group chat + DMs)

## What exists already — reuse, don't rebuild

The counselor↔client chat already has a fully working voice-message pipeline:
recording (`src/hooks/useVoiceRecorder.ts`), a hold-to-record mic button using
Pointer Events (`src/components/chat/ChatInput.tsx`), upload + transcription
(`src/app/api/counselor/chat/voice/route.ts`), and a Supabase Storage bucket
(`chat-attachments`) that already has audio MIME types allowlisted (fixed in an
earlier session — voice notes were silently rejected by Storage before that). Team
Hub gets the same capability by wiring these same pieces into `team_messages` and
`direct_messages` instead of `conversations`.

`useVoiceRecorder` is already generic — no client-specific logic — so it's imported
as-is, unchanged.

---

## 1. Migration — attachment columns on both message tables

**File:** `supabase/migrations/20260806000000_team_hub_voice_messages.sql` (new)

```sql
alter table team_messages add column if not exists attachment_url text;
alter table team_messages add column if not exists attachment_name text;
alter table team_messages add column if not exists attachment_type text;

alter table direct_messages add column if not exists attachment_url text;
alter table direct_messages add column if not exists attachment_name text;
alter table direct_messages add column if not exists attachment_type text;
```

Run this in the Supabase SQL editor before deploying the code below — same rule as
every other migration in this project, it isn't applied automatically. (Given the
last two bugs both traced back to a skipped migration, double-check this one
actually gets run before testing.)

---

## 2. API — group chat voice upload

**File:** `src/app/api/team/messages/voice/route.ts` (new)

```ts
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
```

## 3. API — direct message voice upload

**File:** `src/app/api/team/dm/[peerId]/voice/route.ts` (new) — same shape, targets
`direct_messages` and a specific peer instead of the whole team.

```ts
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

type RouteParams = { params: Promise<{ peerId: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { peerId } = await params

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
    console.error('[team/dm/voice] storage error:', uploadError)
    return NextResponse.json({ error: 'Voice upload failed' }, { status: 500 })
  }

  const { data: signed } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const transcript = clientTranscript || (await transcribeAudio(bytes, baseMimeType, attachmentName))

  const { data: message, error: insertError } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: identity.id,
      sender_name: identity.name,
      recipient_id: peerId,
      content: transcript || '[Voice note]',
      attachment_url: signed?.signedUrl ?? '',
      attachment_name: attachmentName,
      attachment_type: 'audio',
    })
    .select()
    .single()

  if (insertError) {
    console.error('[team/dm/voice] db error:', insertError)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  return NextResponse.json({ message })
}
```

## 4. Frontend — mic button + playback

**File:** `src/components/team/TeamHub.tsx` — inside `GroupChat`:

Add the import and hook (mirrors `ChatInput.tsx` exactly):
```tsx
import { Mic, Square } from 'lucide-react' // add to existing lucide-react import
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
```

Inside `GroupChat`, alongside the existing `content`/`sending` state:
```tsx
const [voiceUploading, setVoiceUploading] = useState(false)

const { recording, seconds: recordSeconds, start: startRecording, stop: stopRecording, cancel: cancelRecording } =
  useVoiceRecorder({
    onRecorded: async (blob, mimeType, ext, transcript) => {
      setVoiceUploading(true)
      try {
        const fd = new FormData()
        fd.append('mimeType', mimeType)
        fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
        if (transcript) fd.append('transcript', transcript)
        const res = await fetch('/api/team/messages/voice', { method: 'POST', body: fd })
        const data = await res.json()
        if (res.ok) setMessages((prev) => [...prev, data.message])
      } finally {
        setVoiceUploading(false)
      }
    },
  })
```

In the message-bubble render, right before `{msg.content}`, add audio playback when
present:
```tsx
{(msg as Message & { attachment_type?: string; attachment_url?: string }).attachment_type === 'audio' ? (
  <audio controls src={(msg as Message & { attachment_url?: string }).attachment_url} className="max-w-[220px]" />
) : (
  msg.content
)}
```
(Also add `attachment_url?: string; attachment_name?: string; attachment_type?: string`
to the `Message` type at the top of the file, rather than casting inline — cleaner,
do that instead of the inline cast above if preferred.)

Next to the existing send button in the form, add the mic button — same
pointer-event hold-to-record pattern as `ChatInput.tsx`, not a click-to-toggle
(click-based mic buttons are the exact bug that was fixed for client chat earlier):
```tsx
<button
  type="button"
  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startRecording() }}
  onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); stopRecording() }}
  onPointerCancel={() => cancelRecording()}
  disabled={sending || voiceUploading}
  aria-label={recording ? 'Stop recording' : 'Hold to record voice note'}
  className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-all disabled:opacity-40 ${recording ? 'scale-110 bg-red-500/20 text-red-400' : 'text-white/40 hover:text-white'}`}
>
  {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
</button>
```
Show a small "Recording… release to send" indicator the same way `ChatInput.tsx`
does, using `recordSeconds`, if a visible timer is wanted — optional polish.

**File:** `src/components/team/DirectChat.tsx` — identical treatment: same hook
usage but posting to `` `/api/team/dm/${peerId}/voice` `` instead, same mic button,
same playback branch in the message bubble render, same `Message` type extension.

---

## Test checklist

- [ ] Migration run and confirmed (`select attachment_type from team_messages
      limit 1;` doesn't error)
- [ ] Hold the mic button in Team chat, release — message appears with a playable
      audio player and a transcript (if speech was clear) or `[Voice note]`
- [ ] Same in a DM — both sender and recipient can play it back
- [ ] Recording under ~1 second shows the "too short" error from `useVoiceRecorder`
      instead of sending
- [ ] Voice notes show up correctly on mobile (pointer events, not just mouse
      events — test on an actual phone or touch emulation, not just desktop)
- [ ] Realtime: a voice note sent by one person appears live for another person
      already viewing that same chat, without a refresh
