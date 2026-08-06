# Cursor instructions: isolate the CEO's mailbox — no other role can touch it

## Why this exists

The CEO said explicitly: `ceo@aceyourvisa.com` must connect directly to the CEO's
own portal only, no mixup tolerated, because it carries confidential information.

Investigated the existing "Connect email account" feature
(`CounselorEmailConfig.tsx` → `/api/admin/counselors/[counselorId]/email-config`)
to see if it could just be reused for the CEO. **It cannot, as-is** — found a real
gap that makes it unsafe for that purpose:

`src/app/api/admin/counselors/[counselorId]/email-config/route.ts` only checks
`requireAdminApi()`, which passes for **any** `role = 'admin'` (branch manager) or
`role = 'ceo'` account — and then reads/writes whichever `counselorId` is in the
URL, with **no check that the counselor belongs to that admin's branch**, and no
check that the target isn't the CEO's own account. Concretely: any branch manager
today could call
`POST /api/admin/counselors/{ceo's-id}/email-config` directly (not through the UI —
the UI just doesn't expose it, but the API has no idea) and overwrite the CEO's
mailbox connection with credentials of the branch manager's choosing, silently
redirecting the CEO's mail. That's the exact "mixup" being ruled out.

Two changes needed: (1) close that gap for the existing counselor-facing feature,
and (2) build the CEO a completely separate, self-service email connection that no
other role's API can reach at all — not "hidden from the UI," actually
unreachable server-side by anyone but the CEO.

---

## 1. Close the existing gap — branch-ownership check

**File:** `src/app/api/admin/counselors/[counselorId]/email-config/route.ts`

Add a branch check right after `requireAdminApi()` succeeds, in all three handlers
(`GET`, `POST`, `DELETE`), before touching `counselor_email_accounts`:

```ts
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'

// ...inside each handler, after `const { counselorId } = await params`:
const supabase = createAdminClient()

if (isBranchScopedAdmin(admin)) {
  const { data: target } = await supabase
    .from('counselors')
    .select('branch_id, role')
    .eq('id', counselorId)
    .maybeSingle()

  if (!target || target.role !== 'counselor' || target.branch_id !== admin.branch_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

This makes a branch manager's reach match what the UI already implies: only the
counselors in their own branch, never `ceo`, `admin`, or `receptionist` rows,
regardless of what URL is called directly. (`ceo` role skips this check per
`isBranchScopedAdmin`'s existing definition — unaffected, but the CEO won't be
using this route anyway after step 2.)

---

## 2. CEO-only self-service email connection

Separate route, separate table access pattern: the CEO's own identity comes from
their session, never from a URL parameter, so there's no `counselorId` to spoof.

**File:** `src/app/api/admin/my-email-config/route.ts` (new)

```ts
import { NextResponse } from 'next/server'
import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('counselor_email_accounts')
    .select('id, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, is_active')
    .eq('counselor_id', admin.id)   // always the caller's own id — never client-supplied
    .maybeSingle()

  return NextResponse.json({ config: data ?? null })
}

export async function POST(req: Request) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const body = await req.json()
  const { email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, app_password, is_active } = body

  if (!email_address || !app_password) {
    return NextResponse.json({ error: 'email_address and app_password are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error: upsertErr } = await supabase
    .from('counselor_email_accounts')
    .upsert(
      {
        counselor_id: admin.id,
        email_address: email_address.trim(),
        display_name: display_name?.trim() || null,
        imap_host: imap_host?.trim() || 'box2422.bluehost.com',
        imap_port: Number(imap_port) || 993,
        smtp_host: smtp_host?.trim() || 'box2422.bluehost.com',
        smtp_port: Number(smtp_port) || 465,
        app_password,
        is_active: is_active !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'counselor_id' }
    )

  if (upsertErr) {
    console.error('[my-email-config] upsert failed:', upsertErr.message)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const supabase = createAdminClient()
  await supabase.from('counselor_email_accounts').delete().eq('counselor_id', admin.id)
  return NextResponse.json({ success: true })
}
```

Because `requireCeoApi()` rejects anyone whose role isn't `ceo`, and `admin.id`
comes from the authenticated session (never the request body/URL), there is no
path — UI, direct API call, or otherwise — for a branch manager, counselor, or
receptionist to read, overwrite, or delete the CEO's mailbox connection. The CEO
can only ever manage their own row.

**File:** `src/components/admin/MyEmailSettings.tsx` (new) — same form as
`CounselorEmailConfig.tsx` but simplified: no `counselorId` prop (there's nothing
to select, it's always "me"), points at `/api/admin/my-email-config` instead of
`/api/admin/counselors/{id}/email-config`. Reuse the same field layout
(email/display name/IMAP host+port/SMTP host+port/app password with show-hide) —
copy the JSX from `CounselorEmailConfig.tsx` and strip the `counselorId` prop and
the collapsible open/close wrapper (make it always-open on its own settings tab
instead of a collapsed accordion row).

**File:** `src/app/(admin)/admin/settings/page.tsx` — needs the CEO's identity to
decide whether to show the tab. Currently a bare wrapper with no server logic;
change to:

```tsx
import { requireAdmin } from '@/lib/supabase/server'
import { AdminSettings } from '@/components/admin/AdminSettings'

export default async function AdminSettingsPage() {
  const admin = await requireAdmin()
  return (
    <main className="flex-1 p-4 md:p-8">
      <AdminSettings adminRole={admin.role} />
    </main>
  )
}
```

**File:** `src/components/admin/AdminSettings.tsx` — accept the new prop, add an
`'email'` section that only appears for the CEO:

```tsx
type Section = 'notifications' | 'security' | 'data' | 'appearance' | 'office' | 'email'

export function AdminSettings({ adminRole }: { adminRole: string }) {
  // ...existing state...
```

In the section-tabs row, conditionally add:
```tsx
{adminRole === 'ceo' && (
  <SectionTab label="My Email" icon={Mail} active={section === 'email'} onClick={() => setSection('email')} />
)}
```
(`Mail` icon already imported in `CounselorEmailConfig.tsx` — add to the existing
`lucide-react` import in `AdminSettings.tsx`.)

And in the section body, where the other `section === '...'` blocks are:
```tsx
{section === 'email' && adminRole === 'ceo' && <MyEmailSettings />}
```

The `adminRole === 'ceo'` check in the render body is intentionally redundant with
the tab visibility — belt-and-suspenders so the section can never render even if
`section` state is manipulated some other way (e.g. stale state after a role
change mid-session).

---

## Test checklist

- [ ] Sign in as CEO → `/admin/settings` → **My Email** tab appears → connect
      `ceo@aceyourvisa.com` with its Bluehost credentials → save succeeds
- [ ] Sign in as a branch manager (`role = 'admin'`) → `/admin/settings` → **My
      Email** tab does NOT appear
- [ ] As a branch manager, `curl`/Postman a direct `GET` and `POST` to
      `/api/admin/my-email-config` → both return `403 CEO access only`
- [ ] As a branch manager, `POST` to
      `/api/admin/counselors/{ceo's-counselor-id}/email-config` directly → now
      returns `403 Forbidden` (previously would have silently succeeded)
- [ ] As a branch manager, `POST` to
      `/api/admin/counselors/{another-branch's-counselor-id}/email-config` → also
      `403 Forbidden`
- [ ] CEO's `/dashboard`-equivalent email tab shows `ceo@aceyourvisa.com`'s inbox,
      not `admin@aceyourvisa.com`'s
