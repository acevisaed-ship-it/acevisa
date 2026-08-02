# Cursor instructions: Team Hub — private 1:1 chats as tabs, Deadlines board, Highlights board

## Context

`src/components/team/TeamHub.tsx` currently has: one shared "Team chat" (group,
`team_messages` table) and one "Bulletin Board" (`team_posts` + `team_post_replies`).
Everything lives in that one file — sidebar nav, group chat, and bulletin board are
all defined inline. Both `(counselor)/dashboard/hub` and `(admin)/admin/hub` render
the same `<TeamHub>` component, so counselors, Branch Managers, and the CEO all share
it already — nothing to change there. Receptionist has no route into this page at all
(not in their nav, middleware doesn't grant them `/dashboard/hub`), so DMs and the new
boards are automatically counselor/admin/CEO-only without extra work.

Two additions:
1. **Private 1:1 chats** between any two staff members, opening as tabs in the chat
   panel alongside "Team chat"
2. **Two more boards** — Deadlines/Targets (orange glass) and Highlights (blue glass)
   — alongside the existing Bulletin Board, which itself gets refactored into a
   reusable component so all three share the same list/compose/reply logic

---

## 1. Migration

**File:** `supabase/migrations/20260805000000_team_hub_dms_and_boards.sql` (new)

```sql
-- Private 1:1 messages between staff members
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references counselors(id),
  sender_name text not null,
  recipient_id uuid not null references counselors(id),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists direct_messages_pair_idx
  on direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index if not exists direct_messages_recipient_unread_idx
  on direct_messages (recipient_id) where read_at is null;

alter table direct_messages enable row level security;
create policy "direct_messages_all" on direct_messages for all using (true) with check (true);
-- Matches the existing permissive policy already used on team_messages/team_posts —
-- the API routes are the actual access boundary (session-authenticated), not RLS,
-- consistent with how the rest of this table already works.

-- Extend team_posts to support multiple boards + an optional deadline date
alter table team_posts add column if not exists board text not null default 'bulletin';
alter table team_posts add column if not exists due_date date;
create index if not exists team_posts_board_idx on team_posts(board, created_at desc);
```

Run in the Supabase SQL editor before deploying. Existing bulletin posts keep working
unchanged (`board` defaults to `'bulletin'`).

If you want realtime push for DMs (the group chat already does this — see `GroupChat`'s
`postgres_changes` subscription), also run in the SQL editor:
```sql
alter publication supabase_realtime add table direct_messages;
```

---

## 2. API — direct messages

**File:** `src/app/api/team/staff/route.ts` (new) — the list of people you can DM.
Same lightweight auth pattern already used in `api/team/messages` and `api/team/posts`
(session → email → counselors row):

```ts
import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('counselors').select('id').eq('email', user.email).single()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staff } = await admin
    .from('counselors')
    .select('id, name, role')
    .in('role', ['counselor', 'admin', 'ceo'])
    .eq('status', 'active')
    .neq('id', me.id)
    .order('name')

  return NextResponse.json({ staff: staff ?? [] })
}
```

**File:** `src/app/api/team/dm/[peerId]/route.ts` (new) — GET history with one peer,
POST a message to them.

```ts
import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

async function getIdentity() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: counselor } = await admin.from('counselors').select('id, name').eq('email', user.email).single()
  return counselor ? { id: counselor.id, name: counselor.name } : null
}

type RouteParams = { params: Promise<{ peerId: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { peerId } = await params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('direct_messages')
    .select('id, sender_id, sender_name, recipient_id, content, created_at')
    .or(`and(sender_id.eq.${identity.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${identity.id})`)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark messages from this peer as read
  await admin
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', peerId)
    .eq('recipient_id', identity.id)
    .is('read_at', null)

  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request, { params }: RouteParams) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { peerId } = await params

  const { content } = await request.json() as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('direct_messages')
    .insert({
      sender_id: identity.id,
      sender_name: identity.name,
      recipient_id: peerId,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
```

**File:** `src/app/api/team/dm/unread/route.ts` (new) — per-peer unread counts, for
the sidebar badges:

```ts
import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('counselors').select('id').eq('email', user.email).single()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: unread } = await admin
    .from('direct_messages')
    .select('sender_id')
    .eq('recipient_id', me.id)
    .is('read_at', null)

  const counts: Record<string, number> = {}
  for (const row of unread ?? []) counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1

  return NextResponse.json({ counts })
}
```

---

## 3. API — boards (extend existing posts endpoint)

**File:** `src/app/api/team/posts/route.ts` (modify) — accept a `board` filter on GET
and a `board`/`due_date` field on POST:

```ts
export async function GET(request: Request) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const board = searchParams.get('board') || 'bulletin'

  const admin = createAdminClient()
  const { data: posts, error } = await admin
    .from('team_posts')
    .select('id, author_id, author_name, title, content, pinned, board, due_date, created_at')
    .eq('board', board)
    .order('pinned', { ascending: false })
    .order(board === 'deadlines' ? 'due_date' : 'created_at', { ascending: board === 'deadlines' })
    .limit(30)

  // ...rest (reply counts) unchanged
}
```

```ts
export async function POST(request: Request) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content, pinned, board, due_date } = await request.json() as {
    title: string; content: string; pinned?: boolean; board?: string; due_date?: string
  }
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: 'title and content required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_posts')
    .insert({
      author_id: identity.id,
      author_name: identity.name,
      title: title.trim(),
      content: content.trim(),
      pinned: pinned ?? false,
      board: board || 'bulletin',
      due_date: due_date || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
```

(`api/team/posts/[postId]/replies` needs no changes — replies are keyed by `post_id`
regardless of which board the post belongs to.)

---

## 4. UI — generalize the bulletin board into `PostsBoard`

**File:** `src/components/team/PostsBoard.tsx` (new) — move `ComposePost`,
`PostThread`, and `BulletinBoard` out of `TeamHub.tsx` into this file, generalized:

- Rename `BulletinBoard` → `PostsBoard`, add props: `board: string`, `title: string`,
  `icon: React.ReactNode`, `theme?: 'neutral' | 'orange' | 'blue'`, `showDueDate?: boolean`
- `loadPosts` fetches `/api/team/posts?board=${board}`
- `ComposePost` gets an extra `showDueDate` prop — when true, render a `<input
  type="date">` for `due_date` and include it in the POST body, plus pass `board` in
  the POST body
- Post cards show a due-date badge when `post.due_date` is set (regardless of board,
  but in practice only the deadlines board will ever set it)
- Glass theme (new, at top of file):

```ts
const BOARD_THEMES: Record<'neutral' | 'orange' | 'blue', React.CSSProperties> = {
  neutral: {},
  orange: {
    background: 'linear-gradient(145deg, rgba(245,162,78,0.18) 0%, rgba(228,131,40,0.12) 55%, rgba(202,114,32,0.10) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  blue: {
    background: 'linear-gradient(145deg, rgba(53,165,224,0.18) 0%, rgba(32,131,185,0.12) 55%, rgba(23,111,160,0.10) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
}
```

Apply `style={BOARD_THEMES[theme ?? 'neutral']}` on the outer wrapping div (the same
element that currently has `border border-white/10 glass-card crisp-on-dark` in
`TeamHub.tsx` — when embedding `PostsBoard` there, that wrapper div stays in
`TeamHub.tsx` and just gets the inline `style` added per-instance, since `PostsBoard`
itself renders the *inner* header+list+compose, same as `BulletinBoard` did).

Full header row becomes:
```tsx
<div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
  {icon}
  <span className="text-sm font-semibold text-white flex-1">{title}</span>
  <button onClick={() => setComposing(true)} className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-3 py-1.5 text-xs font-bold text-white">
    <Plus className="h-3 w-3" /> Post
  </button>
</div>
```

Post card due-date badge (add inside the existing post `<button>` card, near the
author/time line):
```tsx
{post.due_date && (
  <span className="rounded-full bg-orange/20 px-2 py-0.5 text-[10px] font-bold text-orange">
    Due {new Date(post.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
  </span>
)}
```

---

## 5. UI — direct chat component

**File:** `src/components/team/DirectChat.tsx` (new) — near-identical structure to
the existing `GroupChat` (poll + realtime + optimistic send), but scoped to one peer:

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  sender_id: string
  sender_name: string
  recipient_id: string
  content: string
  created_at: string
}

type Props = {
  currentUserId: string
  peerId: string
  peerName: string
  onClose: () => void
}

// Reuse the same MY_BUBBLE / senderColor helpers already defined in TeamHub.tsx —
// export them from there (or duplicate the two small functions here) rather than
// reimplementing color logic.
import { MY_BUBBLE, senderColor, Avatar, timeAgo } from './TeamHub'

export function DirectChat({ currentUserId, peerId, peerName, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/team/dm/${peerId}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }, [peerId])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dm_${[currentUserId, peerId].sort().join('_')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const m = payload.new as Message
        const belongsToThisPair =
          (m.sender_id === currentUserId && m.recipient_id === peerId) ||
          (m.sender_id === peerId && m.recipient_id === currentUserId)
        if (!belongsToThisPair) return
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, peerId])

  // Polling fallback, same interval as GroupChat
  useEffect(() => {
    const poll = setInterval(loadMessages, 3000)
    return () => clearInterval(poll)
  }, [loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    await fetch(`/api/team/dm/${peerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setContent('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <button onClick={onClose} className="text-white/40 hover:text-white lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar name={peerName} initials={peerName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)} size={32} />
        <span className="text-sm font-semibold text-white flex-1">{peerName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-white/30 py-12">No messages yet. Say hi to {peerName}.</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId
            const color = senderColor(msg.sender_name)
            return (
              <div key={msg.id} className={cn('flex items-end gap-2.5', isMine && 'flex-row-reverse')}>
                <div className={cn('max-w-[68%] flex flex-col', isMine && 'items-end')}>
                  <div className={cn(
                    'px-3.5 py-2.5 text-sm leading-relaxed',
                    isMine ? `${MY_BUBBLE} rounded-2xl rounded-br-sm` : `${color.bubble} rounded-2xl rounded-bl-sm`
                  )}>
                    {msg.content}
                  </div>
                  <p className="mt-1 text-[10px] text-white/20 px-1">{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-white/10 p-3 shrink-0">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Message ${peerName}…`}
          className="flex-1 min-h-[44px] rounded-xl px-3 text-sm outline-none glass-input"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
        />
        <button type="submit" disabled={sending || !content.trim()} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-grad-blue crisp-on-dark disabled:opacity-40">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-white" />}
        </button>
      </form>
    </div>
  )
}
```

In `TeamHub.tsx`, change `function Avatar(...)`, `function senderColor(...)`,
`const MY_BUBBLE`, and `function timeAgo(...)` from unexported to `export` (add the
`export` keyword) — `DirectChat.tsx` imports them rather than duplicating the color
logic.

---

## 6. `TeamHub.tsx` — tabs + DM sidebar + three boards

This is the file that ties everything together. Changes, in order:

**a) Remove** the inline `ComposePost`, `PostThread`, `BulletinBoard` function
definitions (now living in `PostsBoard.tsx`). Import instead:
```ts
import { PostsBoard } from './PostsBoard'
import { DirectChat } from './DirectChat'
```

**b) Add tab state.** A tab is either the group chat or an open DM:
```ts
type Tab = { type: 'group' } | { type: 'dm'; peerId: string; peerName: string }

function tabKey(tab: Tab) {
  return tab.type === 'group' ? 'group' : `dm:${tab.peerId}`
}
```
Inside `TeamHub`, replace the single `mobileView` state with:
```ts
const [openTabs, setOpenTabs] = useState<Tab[]>([{ type: 'group' }])
const [activeTabKey, setActiveTabKey] = useState('group')
const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([])
const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

useEffect(() => {
  fetch('/api/team/staff').then((r) => r.json()).then((d) => setStaff(d.staff ?? []))
}, [])

useEffect(() => {
  const load = () => fetch('/api/team/dm/unread').then((r) => r.json()).then((d) => setUnreadCounts(d.counts ?? {}))
  load()
  const poll = setInterval(load, 5000)
  return () => clearInterval(poll)
}, [])

function openDm(peerId: string, peerName: string) {
  const key = `dm:${peerId}`
  setOpenTabs((prev) => (prev.some((t) => tabKey(t) === key) ? prev : [...prev, { type: 'dm', peerId, peerName }]))
  setActiveTabKey(key)
  setUnreadCounts((prev) => ({ ...prev, [peerId]: 0 }))
}

function closeDm(peerId: string) {
  const key = `dm:${peerId}`
  setOpenTabs((prev) => prev.filter((t) => tabKey(t) !== key))
  if (activeTabKey === key) setActiveTabKey('group')
}
```

**c) Sidebar — add a "Direct Messages" section** below the existing "Chat"/"Bulletin
Board" sections (which now becomes three board entries — see (e)):
```tsx
<p className="px-3 mt-3 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Direct Messages</p>
{staff.map((person) => (
  <button
    key={person.id}
    onClick={() => { openDm(person.id, person.name); setMobileShowContent(true) }}
    className={cn(
      'flex items-center gap-2.5 min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors text-left',
      activeTabKey === `dm:${person.id}` ? 'tab-btn-active' : 'tab-btn-inactive'
    )}
  >
    <Avatar name={person.name} initials={person.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)} size={22} />
    <span className="flex-1 truncate">{person.name}</span>
    {unreadCounts[person.id] > 0 && (
      <span className="rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCounts[person.id]}</span>
    )}
  </button>
))}
```

**d) Content area — tab strip + active tab content**, replacing the current fixed
"GroupChat always mounted, BulletinBoard only on mobile-select" block:
```tsx
<div className="flex items-center gap-1 border-b border-white/10 px-2 overflow-x-auto shrink-0">
  {openTabs.map((tab) => {
    const key = tabKey(tab)
    const label = tab.type === 'group' ? 'Team chat' : tab.peerName
    return (
      <button
        key={key}
        onClick={() => setActiveTabKey(key)}
        className={cn(
          'flex items-center gap-1.5 shrink-0 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors',
          activeTabKey === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
        )}
      >
        {label}
        {tab.type === 'dm' && (
          <span onClick={(e) => { e.stopPropagation(); closeDm(tab.peerId) }} className="ml-1 text-white/30 hover:text-white">
            <X className="h-3 w-3" />
          </span>
        )}
      </button>
    )
  })}
</div>

<div className="flex-1 min-h-0 flex flex-col">
  {activeTabKey === 'group' ? (
    <GroupChat currentUserId={currentUserId} />
  ) : (
    (() => {
      const tab = openTabs.find((t) => tabKey(t) === activeTabKey)
      if (!tab || tab.type !== 'dm') return null
      return <DirectChat currentUserId={currentUserId} peerId={tab.peerId} peerName={tab.peerName} onClose={() => closeDm(tab.peerId)} />
    })()
  )}
</div>
```
Note this replaces the old "GroupChat always mounted + BulletinBoard swapped in on
mobile" approach — bulletin/deadlines/highlights move out of the tab strip entirely
and become their own section below (see (e)), since they were never really a "chat
tab" conceptually and the user's request keeps DMs specifically as tabs.

**e) Bottom boards section — three boards instead of one.** Replace:
```tsx
<div className="hidden lg:flex flex-col rounded-2xl overflow-hidden border border-white/10 glass-card crisp-on-dark" style={{ height: '280px' }}>
  <BulletinBoard />
</div>
```
with:
```tsx
<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
  <div className="flex flex-col rounded-2xl overflow-hidden border border-white/10 glass-card crisp-on-dark" style={{ height: '320px' }}>
    <PostsBoard board="bulletin" title="Bulletin Board" icon={<MessageSquare className="h-4 w-4 text-white/40" />} theme="neutral" />
  </div>
  <div className="flex flex-col rounded-2xl overflow-hidden border border-orange/20" style={{ height: '320px' }}>
    <PostsBoard board="deadlines" title="Deadlines & Targets" icon={<Clock className="h-4 w-4 text-orange" />} theme="orange" showDueDate />
  </div>
  <div className="flex flex-col rounded-2xl overflow-hidden border border-blue/20" style={{ height: '320px' }}>
    <PostsBoard board="highlights" title="Highlights" icon={<Star className="h-4 w-4 text-blue" />} theme="blue" />
  </div>
</div>
```
(add `Clock, Star` to the existing `lucide-react` import in `TeamHub.tsx`)

On mobile, add matching sidebar nav entries and mobile-tab content, mirroring exactly
how "Bulletin board" already works today — add `'deadlines' | 'highlights'` to the
`MobileView` union type and duplicate the existing bulletin nav button + mobile
content block for each, pointing at the new `PostsBoard` instances instead of
`BulletinBoard`.

---

## Test checklist

- [ ] Open a DM with a colleague → it appears as a tab next to "Team chat"; sending a
      message shows it live for both sides (test with two browser sessions / two
      accounts)
- [ ] Unread badge appears on a staff member in the sidebar when they message you
      while you're on a different tab; clears when you open their tab
- [ ] Closing a DM tab returns you to Team chat; reopening the same person's DM shows
      full history (not reset)
- [ ] Bulletin, Deadlines, and Highlights boards are independent — a post made on one
      doesn't appear on another
- [ ] Deadlines board shows the due-date badge and sorts by soonest due date first;
      other boards ignore due_date entirely
- [ ] Visual check: Deadlines board reads as orange glass, Highlights as blue glass,
      Bulletin stays neutral — matches the rest of the app's glassmorphic style
- [ ] Receptionist account still cannot reach `/dashboard/hub` at all (unchanged —
      just confirm nothing here accidentally exposed it)
