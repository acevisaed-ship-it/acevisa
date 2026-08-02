# Cursor instructions: give Admin/CEO live chat access to clients (text + voice)

## Context

Confirmed while answering the user's question: Admin (Branch Manager) and CEO
currently have **no way to message a client at all** — not text, not voice. The
counselor's live chat (`CounselorChatLayout.tsx`) only lives under
`/dashboard/clients/[clientId]/chat`, and middleware forcibly redirects Admin/CEO away
from anything under `/dashboard` back to `/admin`. This isn't a voice-specific gap —
the whole feature was counselor-only by construction.

**Access rule (matches every other branch-scoped feature already built — clients,
counselors, meetings, tasks, applications):** Admin sees/messages clients in their own
branch only; CEO sees/messages any client, any branch.

Good news: `getAuthenticatedCounselor()` (used by the voice endpoint added in
`CURSOR_INSTRUCTIONS_voice_fix_and_applications.md`) already has no role restriction —
it returns any active row in `counselors`, regardless of role. So `/api/counselor/
chat/voice` needs **zero changes** to work for Admin/CEO once they can reach a page
that uses it. This is purely a routing + branch-scoping task, not a backend rewrite.

---

## 1. Make the back button configurable

**File:** `src/components/chat/CounselorChatLayout.tsx`

The back arrow is hardcoded to `/dashboard/clients/${clientId}`, which would bounce an
Admin/CEO straight back to `/admin` (middleware redirects `/dashboard/*` away from
those roles) — needs to be a prop.

Add to `Props`:
```ts
type Props = {
  clientId: string
  clientName: string
  counselorId: string
  counselorName: string
  initialMessages: ChatMessage[]
  backHref?: string   // NEW — defaults to the counselor dashboard path for backward compat
}
```

Update the function signature and the back link:
```tsx
export function CounselorChatLayout({
  clientId,
  clientName,
  counselorId,
  counselorName,
  initialMessages,
  backHref,
}: Props) {
  ...
  <Link
    href={backHref ?? `/dashboard/clients/${clientId}`}
    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-white/30"
  >
    <ArrowLeft className="h-4 w-4 text-white/70" />
  </Link>
```

Everything else in this component is already role-agnostic (it just labels messages
with whichever `counselorName` is passed in) — no other changes needed here.

---

## 2. New route — Admin/CEO chat page

**File:** `src/app/(admin)/admin/clients/[clientId]/chat/page.tsx` (new) — mirrors
`src/app/(counselor)/dashboard/clients/[clientId]/chat/page.tsx`, but branch-scoped
via `requireAdmin()` + `isBranchScoped()` (the same helper already used throughout
`/admin`):

```tsx
import { notFound } from 'next/navigation'
import { createAdminClient, requireAdmin, isBranchScoped } from '@/lib/supabase/server'
import { CounselorChatLayout } from '@/components/chat/CounselorChatLayout'
import type { ChatMessage } from '@/types'

type Props = {
  params: Promise<{ clientId: string }>
}

export default async function AdminClientChatPage({ params }: Props) {
  const { clientId } = await params
  const admin = await requireAdmin()

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, branch_id')
    .eq('id', clientId)
    .single()

  if (!client) notFound()
  if (isBranchScoped(admin) && client.branch_id !== admin.branch_id) notFound()

  const { data: messages } = await supabase
    .from('conversations')
    .select('id, message_text, sender, counselor_name, timestamp, attachment_url, attachment_name, attachment_type')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  return (
    <CounselorChatLayout
      clientId={clientId}
      clientName={client.name}
      counselorId={admin.id}
      counselorName={admin.name}
      initialMessages={(messages ?? []) as ChatMessage[]}
      backHref={`/admin/clients/${clientId}`}
    />
  )
}
```

Uses `notFound()` for a wrong-branch Admin the same way the rest of `/admin` already
does — no separate 403 page needed, matches existing convention.

---

## 3. Link to it from the Admin client profile page

**File:** `src/app/(admin)/admin/clients/[clientId]/page.tsx`

Add a chat link next to `CopyPortalLink` in the top bar, mirroring the counselor
page's "💬 Chat with Student" button exactly:

```ts
import Link from 'next/link'   // already imported — just confirming it's there
```
```tsx
<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
  <Link href="/admin/clients" className="inline-flex items-center text-sm text-white/60 hover:text-white">
    ← Back to all clients
  </Link>
  <div className="flex flex-wrap items-center gap-2">
    <Link
      href={`/admin/clients/${clientId}/chat`}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      style={{ background: 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)' }}
    >
      💬 Chat with Student
    </Link>
    <CopyPortalLink clientId={clientId} />
  </div>
</div>
```

**Also worth fixing while touching this file** — the client lookup on this page has
no branch scoping at all today:
```ts
const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()
```
A Branch Manager can currently view any client's full profile (notes, documents,
psychological read, everything) just by guessing/knowing the URL, regardless of
branch — a pre-existing gap, same category as the one already fixed on the tasks
endpoint. Fix it the same way as the new chat page:
```ts
await requireAdmin()   // already called — capture the return value:
const admin = await requireAdmin()
...
const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()
if (!client) notFound()
if (isBranchScoped(admin) && (client as Client).branch_id !== admin.branch_id) notFound()
```
(add `isBranchScoped` to the existing `import { createAdminClient, requireAdmin } from
'@/lib/supabase/server'` line)

---

## Test checklist

- [ ] Branch Manager can open chat + send text and voice to a client **in their own
      branch**; message appears correctly labeled with their name
- [ ] Branch Manager hitting `/admin/clients/[id]/chat` for a client in a **different**
      branch gets a 404, not the chat screen
- [ ] CEO can open chat with any client, any branch
- [ ] Voice note sent by an Admin/CEO plays correctly in the student's portal chat,
      same as one sent by a counselor (no backend changes needed here — confirm the
      existing voice endpoint just works)
- [ ] Back button from the new admin chat page returns to `/admin/clients/[id]`, not
      `/dashboard/...` (would have bounced them via middleware before this fix)
- [ ] Counselor's own chat page/back button still works exactly as before —
      `backHref` defaulting to the old path means zero behavior change there
- [ ] Branch Manager viewing a client profile outside their branch now gets 404
      (the adjacent fix in §3)
