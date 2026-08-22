# Remove Leads/Clients — CEO + Admin Only (Soft Delete)

## Goal

Give CEO and branch admins a way to remove a lead/client from the portal. Confirmed with the client: **soft delete** — the record is hidden from normal lists and blocked from further activity, but nothing is hard-deleted. History (chat, activity log, invoices) stays intact for audit purposes. Removed clients must be restorable.

Counselors and receptionist do **not** get this action anywhere in the UI. Role gating must allow both `ceo` (unrestricted, all branches) and `admin` (own branch only) — do **not** copy the existing bug in `src/app/api/clients/suspend/route.ts` line 29, which checks `if (counselor.role !== 'admin')` and therefore also wrongly branch-restricts the `ceo` role. Fix that bug in the same pass since this doc touches that exact file.

Check git history / current `main` first — if any of this has already been implemented, skip that step and move on.

## 1. Migration

New file `supabase/migrations/20260807020000_client_soft_delete.sql`:

```sql
alter table clients add column if not exists deleted_at timestamptz;
alter table clients add column if not exists deleted_by uuid references counselors(id);

create index if not exists idx_clients_deleted_at
  on clients (deleted_at)
  where deleted_at is not null;
```

Do not overload the existing `status` column (`add_client_status.sql` has a `CHECK (status IN ('active','suspended'))` constraint) — `deleted_at`/`deleted_by` are separate columns so "suspended" and "removed" stay independent states and existing suspend/reactivate logic is untouched.

## 2. API: extend `src/app/api/clients/suspend/route.ts`

Rename the accepted `action` union to add `'remove' | 'restore'`, alongside the existing `'suspend' | 'reactivate'`. Replace the role check with proper branch scoping for admin and full access for ceo:

```ts
import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId, action } = await request.json() as {
    clientId?: string
    action?: 'suspend' | 'reactivate' | 'remove' | 'restore'
  }

  if (!clientId || !action) {
    return NextResponse.json({ error: 'clientId and action are required' }, { status: 400 })
  }

  const isRemovalAction = action === 'remove' || action === 'restore'

  // Remove/restore is CEO + branch-admin only. Suspend/reactivate keeps its
  // existing counselor-can-touch-own-clients behavior.
  if (isRemovalAction && counselor.role !== 'ceo' && counselor.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()

  let update: Record<string, unknown>
  if (action === 'suspend') update = { status: 'suspended' }
  else if (action === 'reactivate') update = { status: 'active' }
  else if (action === 'remove') update = { deleted_at: new Date().toISOString(), deleted_by: counselor.id }
  else update = { deleted_at: null, deleted_by: null } // restore

  const query = supabase.from('clients').update(update).eq('id', clientId)

  // Branch-scoped admin only touches their own branch. CEO is unrestricted.
  // Counselor (suspend/reactivate only) only touches their own clients.
  if (counselor.role === 'admin') {
    query.eq('branch_id', counselor.branch_id)
  } else if (counselor.role === 'counselor') {
    query.eq('counselor_id', counselor.id)
  }
  // ceo: no additional filter

  const { data, error } = await query.select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Client not found or not authorized' }, { status: 404 })
  }

  const descriptions: Record<string, string> = {
    suspend: `Account suspended by ${counselor.name}`,
    reactivate: `Account reactivated by ${counselor.name}`,
    remove: `Client removed by ${counselor.name}`,
    restore: `Client restored by ${counselor.name}`,
  }
  const actionTypes: Record<string, string> = {
    suspend: 'account_suspended',
    reactivate: 'account_reactivated',
    remove: 'client_removed',
    restore: 'client_restored',
  }

  await logActivity({
    clientId,
    counselorId: counselor.id,
    actionType: actionTypes[action],
    description: descriptions[action],
  })

  return NextResponse.json({ success: true, action })
}
```

Verify `logActivity`'s `actionType` param isn't a constrained enum/CHECK constraint anywhere — if it is, add `'client_removed'`/`'client_restored'` to that constraint in the same migration.

## 3. UI: `src/components/admin/AllClientsTable.tsx`

- Add `deleted_at?: string | null` to the `AdminClientRow` type.
- Add a new filter mode `'removed'` to the `FilterMode` union and its button row (label "Removed"). Default view (`'all'`) should exclude removed clients; the `'removed'` tab shows only `c.deleted_at`.
- In the `filtered` memo, when `filterMode !== 'removed'`, always exclude rows where `deleted_at` is set (so removed clients don't leak into "All"/"Unassigned"/"By Counselor"/"By Stage" views).
- Row actions column: for a non-removed row, add a "Remove" button next to Transfer/View Profile — `border border-red-400/30 text-red-300 hover:bg-red-500/10` styling to visually distinguish it as destructive, opens a small confirm step (reuse the existing `toast` pattern or a simple `window.confirm`-style inline confirm — match whatever confirm pattern `TransferModal` or similar already uses in this codebase; check before adding a new one). On confirm, `PATCH /api/clients/suspend` with `{ clientId, action: 'remove' }`, then remove the row from local `rows` state (or mark `deleted_at`) and show the existing toast pattern ("Client removed").
- For a removed row (visible only in the "Removed" tab), replace Transfer/View Profile with a single "Restore" button — same PATCH endpoint with `action: 'restore'`, then update local state and toast ("Client restored").
- Add a small "Removed" badge next to the name (same style as the existing `Suspended` badge, red-tinted) when viewing the Removed tab.

## 4. Update the page that feeds the table: `src/app/(admin)/admin/clients/page.tsx`

Fetch `deleted_at` in the select (`select('*, ...)'` already uses `*` so it's included), and pass `deleted_at: row.deleted_at ?? null` through in the row mapping. No query-level filter needed here — the table component now handles hiding removed clients from the default view client-side, and needs the removed rows available for the "Removed" tab.

## 5. Tier 1 — exclude removed clients from lists, counts, and dashboard stats

These must add `.is('deleted_at', null)` (or equivalent) so removed clients stop appearing anywhere counts/lists are shown to counselors, receptionist, or in aggregate stats. `admin/clients/page.tsx` is the one exception above (it needs to fetch both, filtering is done in the UI).

- `src/lib/admin/getCounselorsWithCounts.ts` — the `clientsByCounselorCount` embedded count (`src/lib/supabase/relations.ts`) needs the embedded resource filtered. Supabase-js supports this via `.filter('clients.deleted_at', 'is', null)` chained onto the query that selects the embed — verify this produces `&clients.deleted_at=is.null` in the request and actually filters the aggregate (test it). If it doesn't filter correctly, fall back to a separate `count`-only query per counselor filtered on `deleted_at is null` instead of the embedded aggregate.
- `src/app/(admin)/admin/unassigned/page.tsx` and `src/app/api/admin/unassigned-count/route.ts` — add `deleted_at is null` filter so removed clients don't show as unassigned leads.
- `src/app/(admin)/admin/crm/page.tsx` and `src/app/api/admin/crm/deals/route.ts` — CRM/pipeline board should not show removed clients as deals.
- `src/app/api/admin/clients/route.ts` — main clients list API, filter removed out by default (add an optional `?includeRemoved=true` query param if this API is reused for the Removed tab; otherwise leave it to the page-level fetch above).
- `src/app/api/admin/analytics/route.ts` and `src/app/api/admin/performance/route.ts` — dashboard/branch stats should not count removed clients in totals, pipeline funnel, or conversion numbers.
- `src/app/(admin)/admin/counselors/[counselorId]/dashboard/clients/page.tsx` — a specific counselor's client list as viewed by admin/CEO — exclude removed.
- `src/app/(counselor)/dashboard/clients/page.tsx` and `src/app/api/counselor/active/route.ts` — counselor's own client list — exclude removed (a counselor should never see a client CEO/admin removed).
- `src/lib/dashboard/getCounselorDashboardData.ts` and `src/lib/dashboard/getPipelineData.ts` — dashboard/pipeline aggregate queries — exclude removed.
- `src/app/api/receptionist/search/route.ts` and `src/app/api/receptionist/lookup/route.ts` — receptionist search/lookup should not surface removed clients (prevents re-booking/re-engaging a removed lead through the front desk).

## 6. Tier 2 — block direct access/actions on a removed client

Add a small shared helper, e.g. in `src/lib/clients/assertNotDeleted.ts`:

```ts
export function isClientRemoved(client: { deleted_at?: string | null } | null | undefined) {
  return !!client?.deleted_at
}
```

Apply a "removed → block" check at the highest-risk entry points first (these directly let a removed client act in the portal or let staff act on their behalf):

- `src/app/api/student/auth/login/route.ts` — mirror the existing `status === 'suspended'` block (same file already has this pattern) — if `deleted_at` is set, return the same generic `401 { error: 'Incorrect password.' }` used for suspended, so a removed client can't tell the difference between wrong password and being removed.
- `src/app/(student)/student/chat/page.tsx` and `src/app/api/chat/route.ts`, `src/app/api/chat/upload/route.ts`, `src/app/api/chat/voice/route.ts` — block sending/receiving new chat activity for a removed client (403).
- `src/app/(public)/schedule/[clientId]/page.tsx` and `src/app/api/meetings/request/route.ts`, `src/app/api/meetings/auto-book/route.ts`, `src/app/api/meetings/schedule/route.ts`, `src/app/api/meetings/[meetingId]/reschedule/route.ts` — block booking/rescheduling for a removed client.
- `src/app/api/admin/clients/[clientId]/assign/route.ts` — block assigning a counselor to a removed client.

For the remaining client-scoped API routes found via `.from('clients')` (student auth confirm-setup/forgot-password/avatar, counselor regenerate-profile/strategy/activity/applications, complaints, escalation, documents/request, profile-updates, notifications/send, register, return) — apply the same `isClientRemoved` guard after the existing client fetch, returning 403/404. These are lower-traffic and lower-risk than the ones above; sweep them in the same PR but don't block the rest of this feature on covering every single one exhaustively — flag any you skip so we can track them.

Explicitly **leave untouched** (financial/audit trail must survive a removal): `src/app/api/admin/invoices/route.ts`, `src/app/api/admin/invoices/[id]/payment/route.ts`, `src/app/api/admin/hr-flags/route.ts`, activity log endpoints, and the client detail/chat-history *view* pages for admin/CEO (`admin/clients/[clientId]/page.tsx`, `admin/clients/[clientId]/chat/page.tsx`) — CEO/admin should still be able to open a removed client's profile to review history or restore them; just show a "Removed" banner there, don't hard-block the page load for admin/ceo roles specifically (do block it for counselor-role access to a removed client's detail page, since counselors shouldn't see removed clients at all).

## 7. Verification checklist

- Migration applies cleanly on a fresh dev DB copy.
- CEO can remove/restore a client in any branch; branch admin can only remove/restore clients in their own branch (test cross-branch attempt returns 404/403).
- Counselor and receptionist have no Remove/Restore UI anywhere and get 403 if they hit the API directly with `action: 'remove'` or `'restore'`.
- A removed client cannot log into the student portal (generic "Incorrect password" message, not a distinct "removed" message).
- A removed client disappears from: All Clients (default tab), Unassigned, CRM/deals board, counselor's own client list, dashboard counts/analytics, receptionist search.
- A removed client still appears in: the "Removed" tab (with Restore action), existing invoices/financial records, activity log history.
- Restoring a client reverses all of the above.
