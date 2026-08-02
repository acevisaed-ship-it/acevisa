# Cursor instructions: receptionist walk-in / office footprint log

## The ask

Every client who physically comes into the office — regardless of whether they're a
brand-new registration, an already-registered client coming back for a document
drop-off, a payment, a follow-up, anything — needs their visit recorded by the
receptionist. This is distinct from registration: registration only happens once per
client, but a client can walk in many times over their case. Today there's no way to
log a repeat visit at all — the receptionist's only tool is the registration form and a
narrow client-ID lookup.

The record needs to surface to: the client's counselor, the branch manager (Admin),
and the CEO.

## Key finding — no new table, no migration needed

The app already has a generic `activity_logs` table (`client_id`, `counselor_id`,
`action_type`, `description`, `visibility`, `metadata`, `created_at`) with a shared
`logActivity()` helper in `src/lib/activityLog.ts`, and **three places already render
it for the exact three audiences this needs to reach**:

- `src/app/(counselor)/dashboard/clients/[clientId]/page.tsx` — already queries
  `activity_logs` for `client_id` and renders it via `ActivityHistorySection`. A
  counselor already sees every logged event for their own clients here.
- `src/app/api/admin/activity/route.ts` + `/admin/activity` — Branch Manager view,
  already branch-scoped via the joined `clients.branch_id`.
- `src/app/api/admin/activity/route.ts` (same endpoint, unscoped path) +
  `/admin/staff-activity` — CEO view, sees every branch.

So: if the receptionist's "log a walk-in" action writes one `activity_logs` row with
`action_type: 'walk_in'` and a real `client_id`, it automatically appears in all three
places with zero changes to any of those three views. The only net-new work is (1)
giving the receptionist a way to find any client in their branch and log the visit, and
(2) a couple of cosmetic color/label additions so `walk_in` entries look intentional
rather than falling back to the generic gray badge.

---

## 1. New file — search endpoint for the walk-in flow

`src/app/api/receptionist/search/route.ts`

This is deliberately a **separate, new** endpoint rather than modifying the existing
`src/app/api/receptionist/lookup/route.ts`. That existing route is a narrow exact-code
lookup already used for the referral-verification flow — leaving it untouched avoids
any regression risk there. This new one supports partial name-or-code search so the
receptionist can find someone at the front desk without needing their exact AV-code
memorized.

```ts
import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createAdminClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select(`id, name, client_code, ${clientCounselorName}`)
    .eq('branch_id', receptionist.branch_id)
    .or(`name.ilike.%${q}%,client_code.ilike.%${q}%`)
    .order('name')
    .limit(8)

  if (error) {
    console.error('[receptionist/search] query failed:', error.message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  const results = (clients ?? []).map((c) => {
    const counselor = c.counselors as unknown as { name: string } | null
    return {
      id: c.id,
      name: c.name,
      clientCode: c.client_code,
      counselorName: counselor?.name ?? 'Unassigned',
    }
  })

  return NextResponse.json({ results })
}
```

## 2. New file — log + list walk-ins

`src/app/api/receptionist/walk-ins/route.ts`

```ts
import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { getTodayPKTDateString, getPKTDayBounds } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// GET — today's walk-ins logged in this receptionist's branch (front-desk reference,
// also doubles as a quick sanity check that a check-in actually saved).
export async function GET() {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const supabase = createAdminClient()
  const { startUTC, endUTC } = getPKTDayBounds(getTodayPKTDateString())

  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('id, client_id, description, created_at, metadata, clients(name, branch_id)')
    .eq('action_type', 'walk_in')
    .eq('clients.branch_id', receptionist.branch_id)
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[receptionist/walk-ins] fetch failed:', error.message)
    return NextResponse.json({ error: 'Failed to load walk-ins' }, { status: 500 })
  }

  const walkIns = (logs ?? [])
    .filter((log) => log.clients) // drop rows the branch filter excluded
    .map((log) => {
      const client = log.clients as unknown as { name: string } | null
      const metadata = (log.metadata ?? {}) as { note?: string }
      return {
        id: log.id,
        clientId: log.client_id,
        clientName: client?.name ?? 'Unknown client',
        note: metadata.note ?? null,
        createdAt: log.created_at,
      }
    })

  return NextResponse.json({ walkIns })
}

// POST — log a walk-in for a client already found via /api/receptionist/search.
export async function POST(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const clientId = body?.clientId as string | undefined
  const note = (body?.note as string | undefined)?.trim() || null

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, branch_id')
    .eq('id', clientId)
    .eq('branch_id', receptionist.branch_id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found in your branch' }, { status: 404 })
  }

  await logActivity({
    clientId: client.id,
    counselorId: receptionist.id,
    actorRole: 'receptionist',
    actionType: 'walk_in',
    description: note
      ? `${client.name} walked into the office — ${note}`
      : `${client.name} walked into the office`,
    visibility: 'internal',
    metadata: { note, loggedByName: receptionist.name },
  })

  return NextResponse.json({ success: true })
}
```

## 3. New file — receptionist UI

`src/components/receptionist/ReceptionistWalkIn.tsx`

```tsx
'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type SearchResult = { id: string; name: string; clientCode: string; counselorName: string }
type WalkIn = { id: string; clientId: string; clientName: string; note: string | null; createdAt: string }

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function ReceptionistWalkIn() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [note, setNote] = useState('')
  const [logging, setLogging] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [todayList, setTodayList] = useState<WalkIn[]>([])

  async function loadToday() {
    const res = await fetch('/api/receptionist/walk-ins')
    const data = await res.json()
    if (res.ok) setTodayList(data.walkIns ?? [])
  }

  useEffect(() => { loadToday() }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/receptionist/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  async function handleLog(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLogging(true)
    setMessage(null)
    try {
      const res = await fetch('/api/receptionist/walk-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selected.id, note }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to log walk-in' })
        return
      }
      setMessage({ type: 'success', text: `Walk-in logged for ${selected.name}` })
      setSelected(null)
      setQuery('')
      setResults([])
      setNote('')
      loadToday()
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again' })
    } finally {
      setLogging(false)
    }
  }

  return (
    <Card variant="dark" className="p-5">
      <p className="text-sm font-medium text-bg/70">Record a walk-in</p>
      <p className="mt-1 text-xs text-bg/50">
        Every client visit — new or already registered — should be logged here.
      </p>

      {!selected ? (
        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or AV-code"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
          />
          {searching && <p className="mt-1 text-xs text-bg/40">Searching…</p>}
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-bg/10 rounded-xl border border-bg/10">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { setSelected(r); setResults([]); setQuery('') }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg/5"
                  >
                    <span>
                      <span className="font-semibold">{r.name}</span>{' '}
                      <span className="text-bg/40">· {r.clientCode}</span>
                    </span>
                    <span className="text-xs text-bg/40">{r.counselorName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={handleLog} className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-bg/10 px-3 py-2">
            <span className="text-sm">
              <span className="font-semibold">{selected.name}</span>{' '}
              <span className="text-bg/40">· {selected.clientCode}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-bg/40 hover:text-bg/70"
            >
              Change
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (optional) — e.g. document drop-off, payment"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
          />
          <Button type="submit" disabled={logging}>
            {logging ? 'Logging…' : 'Log walk-in'}
          </Button>
        </form>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}

      {todayList.length > 0 && (
        <div className="mt-5 border-t border-bg/10 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-bg/40">
            Today&apos;s walk-ins ({todayList.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {todayList.map((w) => (
              <li key={w.id} className="flex items-center justify-between text-sm">
                <span>
                  {w.clientName}
                  {w.note && <span className="text-bg/40"> — {w.note}</span>}
                </span>
                <span className="text-xs text-bg/40">{timeOnly(w.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
```

## 4. Wire it into the receptionist page

`src/app/receptionist/page.tsx` — add the import and render it above the registration
form (walk-in logging should be the fastest, most reachable action since it happens
many times a day, versus registration which happens once per client):

```tsx
import { ReceptionistLookup } from '@/components/receptionist/ReceptionistLookup'
import { ReceptionistWalkIn } from '@/components/receptionist/ReceptionistWalkIn'
import { ReceptionistRegisterForm } from '@/components/receptionist/ReceptionistRegisterForm'

export default function ReceptionistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bg">Front Desk</h1>
        <p className="mt-1 text-sm text-bg/60">
          Log every walk-in below, or register a brand-new client further down.
        </p>
      </div>
      <ReceptionistWalkIn />
      <ReceptionistLookup />
      <ReceptionistRegisterForm />
    </div>
  )
}
```

(Heading changed from "Register a New Client" to "Front Desk" since this page now
does two distinct jobs — adjust wording if a different heading is preferred.)

## 5. Cosmetic — give `walk_in` its own color instead of falling back to gray

`src/lib/activityColors.ts` (used by the counselor's client-profile Activity History):

```ts
  if (actionType === 'walk_in') {
    return '#0D9488' // teal — distinct from meeting/task/profile colors already in use
  }
```
Add this as a new `if` block before the final `return 'rgba(10, 63, 58, 0.4)'` fallback.

`src/components/admin/ActivityLogView.tsx` (used by both `/admin/activity` and
`/admin/staff-activity`) — add one line to the existing `ACTION_COLORS` map:

```ts
  walk_in: 'bg-teal-500/20 text-white',
```

---

## Test checklist

- [ ] As a receptionist, search finds both a client who registered via the AI chat
      flow and one registered directly by a receptionist — confirms "no matter what
      type of client" is actually covered, since the search only filters on branch,
      not on how the client originated.
- [ ] Search does **not** return clients from a different branch (branch-scoping
      still holds).
- [ ] Logging a walk-in with no note, and one with a note, both save correctly and
      show up in "Today's walk-ins" immediately after.
- [ ] The same client's counselor sees the new `walk_in` entry in Activity History on
      `/dashboard/clients/[clientId]`, with the teal badge and the note in the
      description if one was given.
- [ ] The Branch Manager sees it on `/admin/activity`, scoped to their own branch only.
- [ ] The CEO sees it on `/admin/staff-activity`, across all branches.
- [ ] A walk-in logged for a client in Branch A does not appear in Branch B's
      `/admin/activity` for a Branch Manager at Branch B.
- [ ] "Today's walk-ins" list resets at midnight PKT (uses `getPKTDayBounds`, same
      helper already used elsewhere in the app for day-boundary logic).

## Reminder

No database migration in this change — everything rides on the existing
`activity_logs` table, which already has RLS locked to service-role-only inserts, and
every render surface this needs (counselor client page, Branch Manager activity log,
CEO staff activity log) already exists and needs no changes beyond the two color-map
additions above.
