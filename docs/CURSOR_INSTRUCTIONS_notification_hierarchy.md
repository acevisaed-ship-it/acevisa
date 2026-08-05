# Cursor instructions: role-based notification, activity-log, and client visibility

## Requirement

- Counselor: notifications and visibility limited to their own clients only.
- Branch manager (`admin`): notifications and visibility for every counselor and
  client in their own branch.
- CEO (`ceo`): notifications and visibility for every branch, every counselor,
  every client, company-wide.

This applies to notifications, activity logs, and client records.

## What's already correct — verified, no changes needed

Checked all three data paths against the three roles before writing anything, to
avoid re-fixing what already works:

- **Client records.** Counselor's client list
  (`src/app/(counselor)/dashboard/clients/page.tsx`) filters
  `.eq('counselor_id', counselor.id)` — a counselor only ever sees their own
  clients. The client detail page
  (`src/app/(counselor)/dashboard/clients/[clientId]/page.tsx`) filters the same
  way on the specific client, so a counselor can't view another counselor's client
  even by guessing the URL — confirmed, not just assumed. Admin/CEO client list
  (`src/app/(admin)/admin/clients/page.tsx`) branch-scopes via `isBranchScoped()`
  when the caller is a branch manager, and skips scoping entirely for `ceo` — so
  branch managers see their branch, CEO sees everyone. **This is all already
  correct.**
- **Activity logs.** `src/app/api/admin/activity/route.ts` already branch-scopes
  for `admin` via `isBranchScopedAdmin()` (`.or()` filter on client/counselor
  `branch_id`) and leaves it unscoped for `ceo`. `/admin/staff-activity` is a
  CEO-only page in the sidebar (`ceoOnlyNavItems` in `AdminSidebar.tsx`) —
  company-wide by design. **This is already correct.**
- **Notifications — the one gap.** `lib/notifications.ts`'s `createNotification()`
  inserts a single row for whichever one `counselorId` the caller passes in. There
  is no fan-out anywhere: a branch manager and the CEO currently receive **zero**
  notifications about client events happening under counselors they're responsible
  for — they'd only ever find out by opening `/admin/activity` or `/admin/clients`
  themselves and looking. **This is the actual gap to fix.**

---

## 1. Migration — confirm the `notifications` table (undocumented in migrations)

The `notifications` table is used throughout the app (`lib/notifications.ts`,
`api/notifications/route.ts`) but — unlike every other table in this project —
there's no migration file for it anywhere in `supabase/migrations/`. It exists in
the live database only because it was created by hand at some point. Add the
missing migration now so it's reproducible and so the new index below actually
gets created:

**File:** `supabase/migrations/20260807000000_notification_hierarchy.sql` (new)

```sql
-- notifications table has never had a tracked migration — this documents the
-- existing inferred schema (idempotent) and adds what's needed for hierarchy fan-out.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references counselors(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  client_id uuid references clients(id) on delete cascade,
  task_id uuid,
  meeting_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_counselor_id_created_at_idx
  on notifications(counselor_id, created_at desc);

alter table notifications enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_all'
  ) then
    create policy "notifications_all" on notifications for all using (true) with check (true);
  end if;
end $$;
```

Run this in the Supabase SQL editor before deploying the code below — same rule as
every other migration in this project.

---

## 2. Fan-out logic — one file, no call-site changes

Every existing call to `createNotification()` (11 call sites across
`admin/clients/[clientId]/assign`, `admin/counselors/[counselorId]/tasks`,
`chat/route.ts`, `complaints`, `meetings/auto-book`, `meetings/[id]/reschedule`,
`profile-updates/[id]`, `receptionist/register-client`, `register`) already passes
`clientId` whenever the event is about a client, and omits it for purely internal
things like task assignment. That's the exact signal needed — no call site needs
to change.

**File:** `src/lib/notifications.ts` — replace the whole file:

```ts
import { createAdminClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'task_due'
  | 'meeting_request'
  | 'escalation'
  | 'panic'
  | 'profile_update'
  | 'complaint'
  | 'chat_message'
  | 'task_assigned'

// Client events that stay counselor-only — too high-frequency to push up the
// chain to every branch manager and the CEO (routine chat traffic would bury
// the events that actually need attention). Leadership can still open any
// client's chat directly at any time; they're just not pinged per-message.
const NO_FAN_OUT: NotificationType[] = ['chat_message']

export async function createNotification({
  counselorId,
  type,
  title,
  body,
  clientId,
  taskId,
  meetingId,
}: {
  counselorId: string
  type: NotificationType
  title: string
  body?: string
  clientId?: string
  taskId?: string
  meetingId?: string
}) {
  const supabase = createAdminClient()
  const recipientIds = new Set<string>([counselorId])

  // Client-relevant event (not chat noise) → also notify the branch manager(s)
  // of this counselor's branch, and the CEO(s), company-wide.
  if (clientId && !NO_FAN_OUT.includes(type)) {
    const { data: primary } = await supabase
      .from('counselors')
      .select('branch_id')
      .eq('id', counselorId)
      .maybeSingle()

    const orFilters = ['role.eq.ceo']
    if (primary?.branch_id) {
      orFilters.push(`and(role.eq.admin,branch_id.eq.${primary.branch_id})`)
    }

    const { data: leadership } = await supabase
      .from('counselors')
      .select('id')
      .or(orFilters.join(','))

    for (const l of leadership ?? []) recipientIds.add(l.id)
  }

  const rows = Array.from(recipientIds).map((id) => ({
    counselor_id: id,
    type,
    title,
    body: body || null,
    client_id: clientId || null,
    task_id: taskId || null,
    meeting_id: meetingId || null,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.error('[createNotification] insert failed:', error.message)
}
```

That's the entire change. Because `NotificationBell.tsx` and
`/api/notifications` already key everything off `counselor_id`, and branch
managers/CEO already load `<NotificationBell counselorId={admin.id} context="admin" />`
somewhere in the admin shell (same component, same endpoint, no changes needed
there), the new rows just show up for them automatically once inserted.

---

## Behavior after this change

- A client sends a panic/escalation/complaint/meeting-request, or a profile update
  comes in, or a receptionist registers a new client, or someone assigns a task
  (unchanged — task_assigned has no `clientId`, stays counselor-only) →
- The assigned counselor gets notified (unchanged).
- The branch manager of that counselor's branch also gets notified.
- The CEO also gets notified, regardless of branch.
- Routine chat messages stay counselor-only, same as today — no change in volume
  there.

## Test checklist

- [ ] Migration run, `select * from notifications limit 1;` doesn't error, new
      index exists (`\d notifications` in psql or the table editor)
- [ ] Trigger a client panic/escalation as a test client of a counselor in Branch A
      → that counselor, Branch A's branch manager, and the CEO all get a bell
      notification; a branch manager in Branch B does not
- [ ] Send a routine chat message from a test client → only the assigned
      counselor gets notified, branch manager/CEO do not
- [ ] Assign a task to a counselor → only that counselor is notified (unchanged
      behavior, confirms `NO_FAN_OUT`/no-`clientId` path wasn't broken)
- [ ] Receptionist registers a walk-in client under a Branch A counselor → Branch
      A's manager and the CEO both see a "new client" notification
