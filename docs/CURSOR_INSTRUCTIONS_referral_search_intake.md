# Cursor instructions: receptionist referral, client ID lookup, counselor search

Implements the design in `docs/requirements-receptionist-referral-and-student-intake.md`.
Six file changes (3 new, 3 modified), no migration needed — `counselor_id` and
`client_code` already exist on `clients`. Test each numbered task independently; they
don't depend on each other except #2 depends on #1's endpoint existing.

---

## 1. New endpoint — list counselors in the receptionist's branch

**File:** `src/app/api/receptionist/branch-counselors/route.ts` (new)

```ts
import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data: counselors, error } = await supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .eq('branch_id', receptionist.branch_id)
    .order('name')

  if (error) {
    console.error('[receptionist/branch-counselors] error:', error)
    return NextResponse.json({ error: 'Failed to load counselors' }, { status: 500 })
  }

  return NextResponse.json({ counselors: counselors ?? [] })
}
```

Deliberately returns `id, name` only — receptionist never sees counselor emails,
phones, or client counts (that's admin-only data via `/api/admin/counselors`).

---

## 2. Update register-client to accept an optional counselor referral

**File:** `src/app/api/receptionist/register-client/route.ts`

Add `createNotification` import:
```ts
import { createNotification } from '@/lib/notifications'
```

Add `counselorId?: string` to the request body type:
```ts
const body = await request.json() as {
  name?: string
  phone?: string
  email?: string
  city?: string
  language?: string
  interested_in?: string
  target_country?: string
  counselorId?: string
}
const { name, phone, email, city, language, interested_in, target_country, counselorId } = body
```

Right after the existing duplicate-phone/duplicate-email checks (before
`generateTempPassword()`), validate the referred counselor belongs to this
receptionist's branch — don't trust the client-submitted ID blindly:

```ts
let referredCounselor: { id: string; name: string } | null = null
if (counselorId) {
  const { data: counselorRow } = await supabase
    .from('counselors')
    .select('id, name, role, status, branch_id')
    .eq('id', counselorId)
    .maybeSingle()

  if (
    !counselorRow ||
    counselorRow.role !== 'counselor' ||
    counselorRow.status !== 'active' ||
    counselorRow.branch_id !== receptionist.branch_id
  ) {
    return NextResponse.json({ error: 'Invalid counselor selection' }, { status: 400 })
  }
  referredCounselor = { id: counselorRow.id, name: counselorRow.name }
}
```

In the `clients` insert, add the counselor assignment:
```ts
.insert({
  name: name.trim(),
  phone: phone.trim(),
  email: emailLower,
  city: city?.trim() || null,
  language: language.toLowerCase(),
  interested_in: interested_in?.trim() || null,
  target_country: target_country?.trim() || null,
  ad_source: 'receptionist',
  branch_id: receptionist.branch_id,
  registered_by: receptionist.id,
  counselor_id: referredCounselor?.id ?? null,   // <-- new
  pipeline_stage: 1,
  qualification_score: 0,
  auth_user_id: authUser.user.id,
  portal_password_set: true,
})
```

After the welcome email is sent, notify the counselor if one was assigned (mirrors
`src/app/api/admin/clients/[clientId]/assign/route.ts`):
```ts
if (referredCounselor) {
  await createNotification({
    counselorId: referredCounselor.id,
    type: 'chat_message',
    title: `New client assigned — ${newClient.name}`,
    body: `Registered and referred to you directly by reception.`,
    clientId: newClient.id,
  })
}
```

Update the activity log call to reflect the referral:
```ts
await logStaffActivity({
  counselorId: receptionist.id,
  actorRole: 'receptionist',
  actionType: 'client_registered',
  description: `Receptionist ${receptionist.name} registered new client ${newClient.name} (${newClient.client_code})${
    referredCounselor ? ` and referred them to ${referredCounselor.name}` : ''
  }`,
  metadata: {
    clientId: newClient.id,
    clientCode: newClient.client_code,
    referredCounselorId: referredCounselor?.id ?? null,
  },
})
```

Return the counselor name so the form can show it on the success screen:
```ts
return NextResponse.json({
  success: true,
  clientId: newClient.id,
  clientCode: newClient.client_code,
  referredCounselorName: referredCounselor?.name ?? null,
})
```

---

## 3. Form UI — "Refer to counselor" dropdown

**File:** `src/components/receptionist/ReceptionistRegisterForm.tsx`

Add to `FormState`:
```ts
counselorId: string
```
Add to `emptyForm`:
```ts
counselorId: '',
```

Add state + fetch-on-mount for the counselor list:
```ts
const [counselors, setCounselors] = useState<{ id: string; name: string }[]>([])

useEffect(() => {
  fetch('/api/receptionist/branch-counselors')
    .then((res) => res.json())
    .then((data) => setCounselors(data.counselors ?? []))
    .catch(() => {})
}, [])
```
(add `useEffect` to the `import { useState, type FormEvent } from 'react'` line)

Add the dropdown — place it after the "Target country" field, before the error/submit
block:
```tsx
<div>
  <label className={labelCls}>Refer to counselor (optional)</label>
  <select
    value={form.counselorId}
    onChange={(e) => setForm({ ...form, counselorId: e.target.value })}
    className={inputCls}
  >
    <option value="">Leave unassigned (Admin will assign)</option>
    {counselors.map((c) => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
</div>
```

Update the success state type and set it from the response:
```ts
const [success, setSuccess] = useState<{ name: string; clientCode: string; counselorName: string | null } | null>(null)
...
setSuccess({ name: form.name, clientCode: data.clientCode, counselorName: data.referredCounselorName ?? null })
```

Update the success card to show the referral:
```tsx
{success.counselorName && (
  <p className="mt-2 text-sm text-bg/70">Referred to <span className="font-semibold">{success.counselorName}</span></p>
)}
```
(place this right after the `client_code` line, before the "welcome email" paragraph)

Submitting `counselorId: ''` in the body is fine — the API treats a falsy value as "no
referral," no client-side filtering needed before the `fetch` call.

---

## 4. New endpoint — receptionist ID lookup (read-only)

**File:** `src/app/api/receptionist/lookup/route.ts` (new)

```ts
import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'Missing client code' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select(`name, client_code, ${clientCounselorName}`)
    .eq('client_code', code)
    .eq('branch_id', receptionist.branch_id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'No client found with that ID in your branch' }, { status: 404 })
  }

  const counselor = client.counselors as unknown as { name: string } | null

  return NextResponse.json({
    name: client.name,
    clientCode: client.client_code,
    counselorName: counselor?.name ?? 'Unassigned',
  })
}
```

Intentionally returns only name + assigned counselor — no case notes, pipeline stage,
or financials. Reuses `clientCounselorName` from `src/lib/supabase/relations.ts` (the
FK-disambiguated join already used on the admin All Clients page) so the join doesn't
break on the same `registered_by` ambiguity.

**File:** `src/components/receptionist/ReceptionistLookup.tsx` (new) — small card, own
component so it doesn't complicate the registration form's state:
```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function ReceptionistLookup() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ name: string; clientCode: string; counselorName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/receptionist/lookup?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Not found')
        return
      }
      setResult(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="dark" className="p-5">
      <p className="text-sm font-medium text-bg/70">Look up a client by ID</p>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="AV-000123"
          className="min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm outline-none glass-input"
        />
        <Button type="submit" disabled={loading || !code.trim()}>
          {loading ? '…' : 'Look up'}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {result && (
        <p className="mt-3 text-sm text-bg/80">
          <span className="font-semibold">{result.name}</span> — counselor:{' '}
          <span className="font-semibold">{result.counselorName}</span>
        </p>
      )}
    </Card>
  )
}
```

Add it to the receptionist page, above the registration form:

**File:** `src/app/receptionist/page.tsx`
```tsx
import { ReceptionistLookup } from '@/components/receptionist/ReceptionistLookup'
import { ReceptionistRegisterForm } from '@/components/receptionist/ReceptionistRegisterForm'

export default function ReceptionistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bg">Register a New Client</h1>
        <p className="mt-1 text-sm text-bg/60">
          Collect the student&apos;s details below. Their account, portal ID, and login
          credentials will be created and emailed to them automatically.
        </p>
      </div>
      <ReceptionistLookup />
      <ReceptionistRegisterForm />
    </div>
  )
}
```

---

## 5. Counselor client list — search by ID

Two small edits to add `client_code` end-to-end. This is a pure addition — same
pattern as the admin All Clients page already uses.

**File:** `src/components/dashboard/CounselorClientsList.tsx`
- Add `client_code: string | null` to `CounselorClientRow`
- In the `filtered` `useMemo`, add to the OR chain:
  `(c.client_code && c.client_code.toLowerCase().includes(q))`
- Update the search input placeholder to `"Search by name, ID, email or phone…"`
- In the table, show the code under the name (same treatment as `AllClientsTable.tsx`):
  ```tsx
  <p className="font-semibold text-white/80">{client.name}</p>
  {client.client_code && (
    <p className="font-mono text-xs font-semibold text-orange/80">{client.client_code}</p>
  )}
  ```

**File:** `src/app/(counselor)/dashboard/clients/page.tsx`
- Add `client_code` to the `.select(...)` string:
  `'id, name, client_code, email, phone, city, pipeline_stage, qualification_score, registration_date, status'`
- Add `client_code: c.client_code ?? null,` to the `rows` mapping

No admin/CEO-side change needed — `AllClientsTable.tsx` already has this.

---

## Test checklist

- [ ] Receptionist dropdown only shows counselors from her own branch (create a second
      branch + counselor in Supabase to confirm cross-branch counselors don't appear)
- [ ] Registering with no counselor selected → client lands on Unassigned as before
- [ ] Registering with a counselor selected → client's `counselor_id` is set, chosen
      counselor gets a notification, activity log shows the referral
- [ ] Submitting a `counselorId` that isn't in the receptionist's branch (e.g. via
      direct API call) → 400 `Invalid counselor selection`
- [ ] Receptionist lookup: valid AV- code in her branch → name + counselor name only,
      no other fields in the response
- [ ] Receptionist lookup: valid code from a *different* branch → 404 (branch scoping
      works)
- [ ] Counselor client list search matches on `client_code` (try both full code and a
      partial substring)

---

## Not included here (separate, optional follow-on)

The Manual Intake form recommendation from `requirements-receptionist-referral-and-
student-intake.md` §3 (giving receptionist-sourced clients a proper briefing card via
`ai_profiles`) is a larger feature — new DB column, new counselor-facing form, new
save endpoint. Worth its own instructions doc when you're ready to prioritize it; not
bundled into this pass since it wasn't explicitly requested yet.
