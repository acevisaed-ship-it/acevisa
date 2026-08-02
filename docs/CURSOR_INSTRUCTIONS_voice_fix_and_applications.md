# Cursor instructions: voice note fix + university applications tracking

Two unrelated items bundled in one doc since they came in together. Part A is a bug
fix (diagnosed below). Part B is a new feature — no schema for this exists today.

---

# Part A — Voice notes not sending

## Root cause

`src/components/chat/ChatInput.tsx`'s mic button is a "press and hold, release to
send" control, bound with `onMouseDown`/`onMouseUp` **and** `onTouchStart`/
`onTouchEnd` on the same element:

```tsx
onMouseDown={startRecording}
onMouseUp={stopRecording}
onTouchStart={(e) => { e.preventDefault(); startRecording() }}
onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
```

The upload only happens inside `mediaRecorder.onstop`, which only fires after
`stopRecording()` calls `.stop()`. The bug: **`mouseup` only fires on the button if the
pointer is still over that exact element when released.** The mic icon is small and
sits in a crowded input bar — any drift of the mouse/finger while holding (extremely
easy in practice) means `onMouseUp` never fires on the button at all. `stopRecording()`
never runs, the `MediaRecorder` keeps recording silently, and the upload code is never
reached. From the user's side: the red "Recording…" indicator appears and just sits
there, or the whole thing quietly does nothing — exactly the symptom reported.

Two secondary bugs found in the same code, worth fixing in the same pass:
- Short recordings fail **silently**: `if (blob.size < 1000) { ...; return }` with no
  `setUploadError` call — an accidental quick tap looks identical to "nothing
  happened," no feedback at all.
- No `onTouchCancel` handling — if the OS interrupts the gesture (incoming call,
  notification, browser takes over the touch for a scroll/zoom), recording state can
  get stuck.

## The fix — switch to Pointer Events with pointer capture

This is the standard fix for hold-to-record/hold-to-draw UI: `setPointerCapture` locks
all subsequent pointer events to the element that started the gesture, so `pointerup`
fires reliably no matter where the pointer ends up. One code path replaces the
mouse+touch dual-binding entirely (works for mouse, touch, and pen).

### 1. New shared hook — `src/hooks/useVoiceRecorder.ts` (new file)

Pulling the recording logic into a hook means the fix (and the upcoming counselor mic
button in Part A.3) don't duplicate ~50 lines of `MediaRecorder` setup.

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Options = {
  onRecorded: (blob: Blob, mimeType: string, ext: string) => void | Promise<void>
  onError?: (message: string) => void
  minBytes?: number
}

export function useVoiceRecorder({ onRecorded, onError, minBytes = 1000 }: Options) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startingRef = useRef(false)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const start = useCallback(async () => {
    if (startingRef.current || mediaRecorderRef.current) return
    startingRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Safari (iOS/macOS) only supports audio/mp4 — webm is Chrome/Firefox only
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        mediaRecorderRef.current = null

        const actualMime = mr.mimeType || mimeType || 'audio/webm'
        const ext = actualMime.includes('mp4') ? 'mp4' : actualMime.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(audioChunksRef.current, { type: actualMime })
        setRecording(false)
        setSeconds(0)

        if (blob.size < minBytes) {
          onError?.('Recording was too short — press and hold the mic a little longer.')
          return
        }
        await onRecorded(blob, actualMime, ext)
      }

      mr.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      onError?.('Microphone access denied. Please allow microphone permission and try again.')
    } finally {
      startingRef.current = false
    }
  }, [minBytes, onError, onRecorded])

  const stop = useCallback(() => { mediaRecorderRef.current?.stop() }, [])
  // Same as stop() — still finalizes via onstop so a cancelled gesture never leaves
  // the recorder running forever. Kept as a separate name for readability at call sites.
  const cancel = useCallback(() => { mediaRecorderRef.current?.stop() }, [])

  return { recording, seconds, start, stop, cancel }
}
```

### 2. `src/components/chat/ChatInput.tsx` — use the hook, fix the button

Delete the entire "Voice state" block (`recording`, `recordSeconds`, `voiceUploading`
stays, `mediaRecorderRef`, `audioChunksRef`, `timerRef`) and the `startRecording`/
`stopRecording` `useCallback`s (lines ~113–184 in the current file). Replace with:

```ts
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
```

```ts
const [voiceUploading, setVoiceUploading] = useState(false)

const { recording, seconds: recordSeconds, start: startRecording, stop: stopRecording, cancel: cancelRecording } =
  useVoiceRecorder({
    onRecorded: async (blob, mimeType, ext) => {
      setVoiceUploading(true)
      try {
        const fd = new FormData()
        fd.append('clientId', clientId)
        fd.append('mimeType', mimeType)
        fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
        const res = await fetch('/api/chat/voice', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        onAttachmentSent?.(data.studentMessage, data.aiMessage)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Voice upload failed')
      } finally {
        setVoiceUploading(false)
      }
    },
    onError: (message) => setUploadError(message),
  })
```

Replace the mic `<button>`'s event handlers:
```tsx
<button
  type="button"
  onPointerDown={(e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startRecording()
  }}
  onPointerUp={(e) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    stopRecording()
  }}
  onPointerCancel={() => cancelRecording()}
  disabled={busy || !!pendingFile}
  aria-label={recording ? 'Stop recording' : 'Hold to record voice note'}
  className={`shrink-0 transition-all disabled:opacity-20 ${recording ? 'scale-110 text-red-400' : 'text-white/30 hover:text-white/70'}`}
>
  {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
</button>
```
(delete the old `onMouseDown`/`onMouseUp`/`onTouchStart`/`onTouchEnd` props entirely —
pointer events supersede all of them)

Everything else in the file (recording indicator, `formatSeconds`, disabled states)
stays as-is — it already reads from `recording`/`recordSeconds`/`voiceUploading`.

### 3. Counselor side has no mic button at all — needs building, not fixing

`src/components/chat/CounselorChatLayout.tsx` (the counselor's live chat with a
student) only has a plain text input — no voice recording exists there today. Given
the bug report mentioned both sides, add it now using the same fixed hook.

**New file:** `src/app/api/counselor/chat/voice/route.ts` — mirrors
`src/app/api/chat/voice/route.ts`, but authenticated, sender `'counselor'`, and no AI
acknowledgment message (that's specific to student-initiated voice notes):

```ts
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
  const mimeType = (formData.get('mimeType') as string | null) || audio.type || 'audio/webm'
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const timestamp = Date.now()
  const storagePath = `${clientId}/voice-${timestamp}.${ext}`
  const bytes = await audio.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.error('[counselor/chat/voice] storage error:', uploadError)
    return NextResponse.json({ error: 'Voice upload failed' }, { status: 500 })
  }

  const { data: signed } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const { data: message, error: insertError } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      sender: 'counselor',
      counselor_name: counselor.name,
      message_text: '[Voice note]',
      stage_tag: 'voice_note',
      attachment_url: signed?.signedUrl ?? '',
      attachment_name: `voice-${timestamp}.${ext}`,
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
```

No rendering changes needed — `ChatBubble.tsx` already renders any message with
`attachment_type === 'audio'` as a playable audio bubble, regardless of sender.

**`CounselorChatLayout.tsx`** — add a mic button next to the existing send button:

```ts
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { Mic, Square } from 'lucide-react'   // add to existing lucide-react import
```

Inside the component, alongside the existing `isSending` state:
```ts
const [voiceUploading, setVoiceUploading] = useState(false)
const { recording, start: startRecording, stop: stopRecording, cancel: cancelRecording } =
  useVoiceRecorder({
    onRecorded: async (blob, mimeType, ext) => {
      setVoiceUploading(true)
      try {
        const fd = new FormData()
        fd.append('clientId', clientId)
        fd.append('mimeType', mimeType)
        fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
        const res = await fetch('/api/counselor/chat/voice', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) return
        setMessages((prev) => [...prev, data.message])
      } finally {
        setVoiceUploading(false)
      }
    },
  })
```

Add the button before the existing send button in the input row:
```tsx
<button
  type="button"
  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startRecording() }}
  onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); stopRecording() }}
  onPointerCancel={() => cancelRecording()}
  disabled={isSending || voiceUploading}
  aria-label={recording ? 'Stop recording' : 'Hold to record voice note'}
  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${recording ? 'scale-110 bg-red-500/20 text-red-400' : 'text-white/50 hover:text-white'}`}
>
  {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
</button>
```

**Worth flagging, not fixing here:** `POST /api/counselor/chat` (the existing text
endpoint this file already uses) has no auth check at all — it trusts `clientId` from
the request body with zero verification of who's calling. The new voice endpoint above
is properly authenticated; the older text one isn't. Leaving the mismatch as-is rather
than expanding scope, but worth a follow-up pass to bring `/api/counselor/chat` in
line.

## A.4 — Second, separate bug: the storage bucket rejects audio outright

If you're seeing the error **"Voice upload failed"** specifically (not silence, not a
stuck recording) — that's a different, guaranteed failure, not the pointer-capture bug
above. Found it in `supabase/migrations/20260613000003_chat_attachments.sql`, which
created the `chat-attachments` bucket with an `allowed_mime_types` allowlist:

```sql
ARRAY[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf', 'application/msword', ...doc/xls/zip/rar...
]
```

**No audio type is in that list at all.** Supabase Storage enforces this at the bucket
level — every single voice upload gets rejected before it ever reaches application
code, regardless of the pointer-events fix. This explains why file/image attachments
work fine but voice notes fail 100% of the time, deterministically, on every attempt.

**Fix — new migration:** `supabase/migrations/20260804000000_chat_attachments_allow_audio.sql`
(new file)

```sql
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
```

Run this in the Supabase SQL editor — it's the single most important fix in this whole
doc; without it the pointer-events fix alone won't be enough, since recording will
stop correctly but every upload will still be rejected.

**Also worth doing while touching this code** — Supabase's mime check can be picky
about the `;codecs=opus` suffix some browsers send (e.g. `audio/webm;codecs=opus`).
Safer to strip it before setting the storage `contentType`, in both
`src/app/api/chat/voice/route.ts` and `src/app/api/counselor/chat/voice/route.ts`:

```ts
const mimeType = (formData.get('mimeType') as string | null) || audio.type || 'audio/webm'
const baseMimeType = mimeType.split(';')[0].trim()   // 'audio/webm;codecs=opus' → 'audio/webm'
const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
```
...and use `contentType: baseMimeType` (instead of `mimeType`) in the
`supabase.storage.from('chat-attachments').upload(...)` call in both files.

## Test checklist — Part A
- [ ] Run the `chat_attachments_allow_audio` migration in Supabase **before** testing
      anything else — without it, voice will fail regardless of the other fixes
- [ ] Hold the mic, drag the pointer well outside the button before releasing →
      recording still stops and uploads (this was the core bug)
- [ ] Very quick accidental tap → visible error message, not silence
- [ ] Test on an actual touch device, not just desktop with mouse emulation
- [ ] Interrupt a recording (e.g. switch apps mid-hold on mobile) → doesn't get stuck
- [ ] Counselor can record and send a voice note; it appears correctly in the
      student's chat history and is playable
- [ ] Student's existing voice notes still work exactly as before

---

# Part B — University application status tracking

## What exists today vs. what's needed

`ApplicationCard.tsx` (singular) already shows a stage tracker — but it's the client's
overall **case** status (`clients.pipeline_stage`, 1–8: registered → documents →
submitted to embassy → approved/rejected/closed). That's the ACE Altius process, not
per-institution. There is currently no concept of "this student applied to 3
universities, here's each one's status" anywhere in the schema. This is a new feature.

## 1. Migration

**File:** `supabase/migrations/20260803000000_university_applications.sql` (new)

```sql
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  program_name text,
  country text,
  status text NOT NULL DEFAULT 'preparing',
  application_reference text,
  submitted_date date,
  decision_date date,
  created_by uuid REFERENCES counselors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_client ON applications (client_id);

-- Status-change history + free-text updates, visible to the student only when 'shared'.
CREATE TABLE IF NOT EXISTS application_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status text,
  note text,
  visibility text NOT NULL DEFAULT 'shared',
  created_by uuid REFERENCES counselors(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_application_updates_app ON application_updates (application_id, created_at DESC);
```

Status is free text (no CHECK constraint) — matches how `tasks.status`,
`counselors.role`, etc. already work in this codebase. The fixed list of values lives
in application code (§2 below), same pattern as `clients.pipeline_stage` labels.

## 2. Shared status constants

**File:** `src/lib/applications.ts` (new)

```ts
export const APPLICATION_STATUSES = [
  'preparing', 'submitted', 'under_review', 'conditional_offer',
  'offer_received', 'enrolled', 'deferred', 'rejected', 'withdrawn',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  preparing: 'Preparing Application',
  submitted: 'Submitted',
  under_review: 'Under Review',
  conditional_offer: 'Conditional Offer',
  offer_received: 'Offer Received',
  enrolled: 'Enrolled',
  deferred: 'Deferred',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  preparing: '#2083B9',
  submitted: '#2083B9',
  under_review: '#E48328',
  conditional_offer: '#B7C733',
  offer_received: '#B7C733',
  enrolled: '#22c55e',
  deferred: '#94a3b8',
  rejected: '#ef4444',
  withdrawn: '#64748b',
}
```

## 3. API — student-facing read

**File:** `src/app/api/applications/route.ts` (new) — same trust model as the existing
`src/app/api/chat/history/route.ts` (accepts `clientId` as a query param, no session
check — that's the established pattern for every student-portal endpoint in this
codebase already, not something introduced here):

```ts
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ applications: [] })

  const supabase = createAdminClient()
  const { data: applications } = await supabase
    .from('applications')
    .select('id, institution_name, program_name, country, status, submitted_date, decision_date, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  const ids = (applications ?? []).map((a) => a.id)
  const { data: updates } = ids.length
    ? await supabase
        .from('application_updates')
        .select('id, application_id, status, note, created_at')
        .in('application_id', ids)
        .eq('visibility', 'shared')
        .order('created_at', { ascending: true })
    : { data: [] }

  const withUpdates = (applications ?? []).map((app) => ({
    ...app,
    updates: (updates ?? []).filter((u) => u.application_id === app.id),
  }))

  return NextResponse.json({ applications: withUpdates })
}
```

## 4. API — staff read/create/update

**File:** `src/app/api/counselor/clients/[clientId]/applications/route.ts` (new) — GET
(full detail, staff-only fields included) + POST (create). Authorizes: assigned
counselor, or Admin (branch-matched), or CEO.

```ts
import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor, getAuthenticatedAdmin, isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ clientId: string }> }

async function authorizeForClient(clientId: string) {
  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, counselor_id, branch_id')
    .eq('id', clientId)
    .single()
  if (!client) return { client: null, staff: null, error: NextResponse.json({ error: 'Client not found' }, { status: 404 }) }

  const counselor = await getAuthenticatedCounselor()
  if (counselor?.role === 'counselor') {
    if (counselor.id !== client.counselor_id) {
      return { client: null, staff: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { client, staff: counselor, error: null }
  }

  const admin = await getAuthenticatedAdmin()
  if (admin) {
    if (isBranchScoped(admin) && admin.branch_id !== client.branch_id) {
      return { client: null, staff: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { client, staff: admin, error: null }
  }

  return { client: null, staff: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { clientId } = await params
  const { client, error } = await authorizeForClient(clientId)
  if (error) return error

  const supabase = createAdminClient()
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .eq('client_id', client!.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ applications: applications ?? [] })
}

export async function POST(request: Request, { params }: RouteParams) {
  const { clientId } = await params
  const { client, staff, error } = await authorizeForClient(clientId)
  if (error) return error

  const body = await request.json() as {
    institution_name?: string
    program_name?: string
    country?: string
    status?: string
    submitted_date?: string
  }
  if (!body.institution_name?.trim()) {
    return NextResponse.json({ error: 'Institution name is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: application, error: insertError } = await supabase
    .from('applications')
    .insert({
      client_id: client!.id,
      institution_name: body.institution_name.trim(),
      program_name: body.program_name?.trim() || null,
      country: body.country?.trim() || null,
      status: body.status || 'preparing',
      submitted_date: body.submitted_date || null,
      created_by: staff!.id,
    })
    .select()
    .single()

  if (insertError || !application) {
    console.error('[applications] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }

  await logActivity({
    clientId: client!.id,
    counselorId: staff!.id,
    actorRole: staff!.role,
    actionType: 'application_added',
    description: `${staff!.name} added a new application: ${application.institution_name}${application.program_name ? ` (${application.program_name})` : ''}`,
    metadata: { applicationId: application.id },
  })

  return NextResponse.json({ application })
}
```

**File:** `src/app/api/counselor/applications/[applicationId]/route.ts` (new) — PATCH,
updates fields and auto-logs a status-change entry when `status` changes.

```ts
import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor, getAuthenticatedAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ applicationId: string }> }

export async function PATCH(request: Request, { params }: RouteParams) {
  const counselor = await getAuthenticatedCounselor()
  const staff = counselor ?? (await getAuthenticatedAdmin())
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { applicationId } = await params
  const body = await request.json() as {
    status?: string
    program_name?: string
    application_reference?: string
    submitted_date?: string
    decision_date?: string
    note?: string
    visibility?: 'internal' | 'shared'
  }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('applications')
    .select('id, client_id, institution_name, status')
    .eq('id', applicationId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const statusChanged = !!body.status && body.status !== existing.status
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) update.status = body.status
  if (body.program_name !== undefined) update.program_name = body.program_name
  if (body.application_reference !== undefined) update.application_reference = body.application_reference
  if (body.submitted_date !== undefined) update.submitted_date = body.submitted_date
  if (body.decision_date !== undefined) update.decision_date = body.decision_date

  const { error: updateError } = await supabase.from('applications').update(update).eq('id', applicationId)
  if (updateError) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  if (statusChanged || body.note) {
    await supabase.from('application_updates').insert({
      application_id: applicationId,
      status: statusChanged ? body.status : null,
      note: body.note?.trim() || null,
      visibility: body.visibility === 'internal' ? 'internal' : 'shared',
      created_by: staff.id,
    })
  }

  if (statusChanged) {
    await logActivity({
      clientId: existing.client_id,
      counselorId: staff.id,
      actorRole: staff.role,
      actionType: 'application_status_changed',
      description: `${staff.name} updated ${existing.institution_name} to "${body.status}"`,
      metadata: { applicationId, from: existing.status, to: body.status },
    })
  }

  return NextResponse.json({ success: true })
}
```

## 5. UI — student-facing (count + list + timeline)

**File:** `src/components/chat/ApplicationsListCard.tsx` (new) — same visual language
as the existing `ApplicationCard.tsx`, placed right alongside it:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus } from '@/lib/applications'

type Update = { id: string; status: string | null; note: string | null; created_at: string }
type Application = {
  id: string
  institution_name: string
  program_name: string | null
  country: string | null
  status: string
  updates: Update[]
}

const glassPanel = {
  background: 'rgba(238,238,237,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as React.CSSProperties

export function ApplicationsListCard({ clientId }: { clientId: string }) {
  const [applications, setApplications] = useState<Application[]>([])
  const [open, setOpen] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/applications?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data) => setApplications(data.applications ?? []))
      .catch(() => {})
  }, [clientId])

  if (applications.length === 0) return null

  return (
    <div className="rounded-2xl p-3" style={glassPanel}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold text-white">My Applications</span>
          <span className="rounded-full bg-blue/20 px-1.5 py-0.5 text-[10px] font-bold text-blue">
            {applications.length}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {applications.map((app) => {
            const status = app.status as ApplicationStatus
            const label = APPLICATION_STATUS_LABELS[status] ?? app.status
            const color = APPLICATION_STATUS_COLORS[status] ?? '#2083B9'
            const isExpanded = expandedId === app.id
            return (
              <div key={app.id} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : app.id)} className="flex w-full items-center justify-between text-left">
                  <div>
                    <p className="text-xs font-semibold text-white">{app.institution_name}</p>
                    {app.program_name && <p className="text-[11px] text-white/50">{app.program_name}</p>}
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}26`, color }}>
                    {label}
                  </span>
                </button>
                {isExpanded && app.updates.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                    {app.updates.map((u) => (
                      <p key={u.id} className="text-[11px] text-white/50">
                        {new Date(u.created_at).toLocaleDateString()} —{' '}
                        {u.note || (u.status ? `Status: ${APPLICATION_STATUS_LABELS[u.status as ApplicationStatus] ?? u.status}` : '')}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**File:** `src/components/chat/ChatLayout.tsx` — add the import and render it right
after the existing `<ApplicationCard currentStage={stage} />` in **both** places it
appears (the desktop aside around line 350, and the mobile "updates" tab around line
418):
```ts
import { ApplicationsListCard } from './ApplicationsListCard'
```
```tsx
<ApplicationCard currentStage={stage} />
<ApplicationsListCard clientId={clientId} />
```

## 6. UI — counselor-facing (add + update status)

**File:** `src/components/brief/ApplicationsSection.tsx` (new) — follows the same
`BriefCard` wrapper convention as `DocumentsChecklistSection.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { BriefCard } from './BriefCard'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus } from '@/lib/applications'

type Application = {
  id: string
  institution_name: string
  program_name: string | null
  country: string | null
  status: string
}

type Props = { clientId: string; applications: Application[] }

export function ApplicationsSection({ clientId, applications: initial }: Props) {
  const [applications, setApplications] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [institution, setInstitution] = useState('')
  const [program, setProgram] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!institution.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/counselor/clients/${clientId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_name: institution, program_name: program, country }),
      })
      const data = await res.json()
      if (res.ok) {
        setApplications((prev) => [data.application, ...prev])
        setInstitution(''); setProgram(''); setCountry(''); setAdding(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(applicationId: string, status: string) {
    setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status } : a)))
    await fetch(`/api/counselor/applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  return (
    <BriefCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Applications <span className="text-white/40">({applications.length})</span>
        </h3>
        <button type="button" onClick={() => setAdding((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-blue hover:underline">
          {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {adding ? 'Cancel' : 'Add application'}
        </button>
      </div>

      {adding && (
        <div className="mb-4 space-y-2 rounded-xl border border-white/10 p-3">
          <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Institution name" className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
          <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Program / course (optional)" className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (optional)" className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
          <button type="button" onClick={handleAdd} disabled={saving || !institution.trim()} className="w-full rounded-full bg-green py-2 text-sm font-bold text-text disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      {applications.length === 0 ? (
        <p className="text-sm text-white/40">No applications lodged yet.</p>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div key={app.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-white">{app.institution_name}</p>
                <p className="text-xs text-white/40">{[app.program_name, app.country].filter(Boolean).join(' — ') || '—'}</p>
              </div>
              <select
                value={app.status}
                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                className="rounded-full px-2 py-1 text-xs font-semibold outline-none"
                style={{ background: `${APPLICATION_STATUS_COLORS[app.status as ApplicationStatus] ?? '#2083B9'}26`, color: APPLICATION_STATUS_COLORS[app.status as ApplicationStatus] ?? '#2083B9' }}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s} style={{ color: '#000' }}>{APPLICATION_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </BriefCard>
  )
}
```

**File:** `src/app/(counselor)/dashboard/clients/[clientId]/page.tsx` — add to the
`Promise.all` fetch list:
```ts
supabase.from('applications').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
```
(destructure as `{ data: applications }`), and render it near `DocumentsChecklistSection`:
```tsx
import { ApplicationsSection } from '@/components/brief/ApplicationsSection'
```
```tsx
<ApplicationsSection clientId={clientId} applications={applications ?? []} />
```

## Not included here (optional follow-on)

Admin/CEO's client detail page (`(admin)/admin/clients/[clientId]/page.tsx`) doesn't
show applications yet — only the counselor's own client page does. Same
`ApplicationsSection` component would drop in there too if you want admins to see it;
skipped for now since it wasn't explicitly asked for.

## Test checklist — Part B
- [ ] Counselor adds an application → appears immediately in their own view and on the
      student's portal
- [ ] Counselor changes status → student's view updates (refresh) and shows a shared
      update entry with the right label
- [ ] An `internal`-visibility note (via the PATCH `note`/`visibility` fields, not yet
      wired to UI here but supported by the API) does **not** appear to the student
- [ ] Admin (branch-matched) can view/add applications for a client in their branch;
      cannot for a client in a different branch
- [ ] A client with zero applications shows nothing on the student side (card hides
      itself) rather than an empty state — matches "only show what's relevant"
