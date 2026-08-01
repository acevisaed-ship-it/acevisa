# Cursor instructions: manual task assignment (Admin → Counselor, CEO → Counselor/Admin)

## Context — what exists today

There is currently **no manual task-assignment feature anywhere in the app.** The
`tasks` table exists and counselors can view/update/annotate their own tasks
(`/dashboard/tasks`, `GET /api/tasks`, `POST /api/tasks/update`,
`POST /api/tasks/[taskId]/actions`), but every existing task is system-generated
(meeting requests, auto-booking — see `src/app/api/meetings/request/route.ts`). Nobody
— not Admin, not CEO — has ever been able to create a task and assign it to someone.

There's also a second, less obvious gap this feature has to close: **Admins (Branch
Managers) have no personal task inbox at all.** The `(admin)` route group has never
needed one, because admins were never task recipients. Since the CEO will now be able
to assign tasks to Admins, an Admin needs somewhere to actually see them —
`/admin/my-tasks`, built below.

Good news: because `tasks.counselor_id` is just a plain FK to `counselors(id)` (no role
CHECK constraint — the whole app keeps every staff role in one `counselors` table),
assigning a task to an Admin needs **no schema change** beyond tracking who assigned
it. And `GET /api/tasks`, `POST /api/tasks/update`, and the task-actions endpoint
already work for *any* authenticated `counselors` row regardless of role — they key off
`getAuthenticatedCounselor()` identity, not role. So once an Admin has a page to view
`/api/tasks`, updating status and adding notes already works with zero further changes.

**Assignment rules:**
- Admin (Branch Manager) → assigns to counselors in their **own branch only**
- CEO (Super Admin) → assigns to counselors in **any branch**, and to **Admins
  (Branch Managers) in any branch**
- Nobody can assign to a receptionist or to another admin/CEO — not requested, don't
  build it

---

## 1. Migration — track who assigned a task

**File:** `supabase/migrations/20260802000000_task_assigned_by.sql` (new)

```sql
-- Tracks who manually assigned a task (Admin or CEO). NULL = system-generated
-- (meeting requests, auto-booking) or self-created by the counselor.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES counselors(id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks (assigned_by);
```

Run this in the Supabase SQL editor before deploying the app code below.

---

## 2. Notifications — add a `task_assigned` type

**File:** `src/lib/notifications.ts`

Add to the `NotificationType` union:
```ts
export type NotificationType =
  | 'task_due'
  | 'meeting_request'
  | 'escalation'
  | 'panic'
  | 'profile_update'
  | 'complaint'
  | 'chat_message'
  | 'task_assigned'   // <-- new
```

**File:** `src/components/dashboard/NotificationBell.tsx`

Add an icon (reuse `ClipboardList` — already imported elsewhere in the admin sidebar,
import it here too):
```ts
import { ClipboardList } from 'lucide-react' // add to existing lucide-react import
```
```ts
const TYPE_ICONS: Record<string, React.ReactNode> = {
  panic: <ShieldAlert size={16} className="text-red-500" />,
  escalation: <AlertCircle size={16} className="text-[#E48328]" />,
  meeting_request: <Calendar size={16} className="text-[#2083B9]" />,
  task_due: <AlertCircle size={16} className="text-[#E48328]" />,
  task_assigned: <ClipboardList size={16} className="text-[#2083B9]" />, // <-- new
  complaint: <Megaphone size={16} className="text-red-400" />,
  profile_update: <UserCog size={16} className="text-[#B7C733]" />,
  chat_message: <MessageSquare size={16} className="text-[#2083B9]" />,
}
```

Add routing in `getNotificationHref` — for the `admin` context, a task assigned to an
Admin should go to the new My Tasks page; for `counselor` context (which also covers
Admins using their own `/admin/my-tasks`... no, careful: this function's `context`
param is literally `'admin' | 'counselor'`, driven by which layout renders the bell —
Admin layout passes `'admin'`, counselor dashboard layout passes `'counselor'`). Add:

```ts
// inside the admin-context switch:
case 'task_assigned':
  return '/admin/my-tasks'
```
```ts
// inside the counselor-context switch:
case 'task_assigned':
  return '/dashboard/tasks'
```

---

## 3. API — create a task, and fix the existing branch-scoping gap

**File:** `src/app/api/admin/counselors/[counselorId]/tasks/route.ts` (existing —
modify)

The current `GET` has two problems worth fixing while you're in this file: it doesn't
branch-scope (a Branch Manager can currently view any counselor's tasks by guessing
the ID, across branches), and it hardcodes `role !== 'counselor'` so it can never
return an Admin's tasks (needed once CEO can view what they assigned — optional for v1
but the validation logic below needs the same lookup anyway, so add it once, shared).

Replace the whole file:

```ts
import { logActivity, logStaffActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ counselorId: string }> }

// Shared: load the target staff member and check the requesting admin/ceo is allowed
// to see/assign to them. Returns the target row, or an error NextResponse.
async function loadAuthorizedTarget(
  admin: { id: string; role: string; branch_id: string | null },
  counselorId: string
) {
  const supabase = createAdminClient()
  const { data: target } = await supabase
    .from('counselors')
    .select('id, name, role, status, branch_id')
    .eq('id', counselorId)
    .single()

  if (!target || target.status !== 'active') {
    return { target: null, error: NextResponse.json({ error: 'Staff member not found' }, { status: 404 }) }
  }

  const allowed =
    admin.role === 'ceo'
      ? target.role === 'counselor' || target.role === 'admin'
      : admin.role === 'admin'
        ? target.role === 'counselor' && target.branch_id === admin.branch_id
        : false

  if (!allowed) {
    return { target: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { target, error: null }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { counselorId } = await params
  const { target, error } = await loadAuthorizedTarget(admin, counselorId)
  if (error) return error

  const supabase = createAdminClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      'id, task_text, due_date, status, notes_count, negligence_flagged, assigned_by, clients(name, id)'
    )
    .eq('counselor_id', target!.id)
    .order('due_date', { ascending: true, nullsFirst: false })

  return NextResponse.json({ tasks: tasks ?? [], counselorId: target!.id })
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { counselorId } = await params
  const { target, error } = await loadAuthorizedTarget(admin, counselorId)
  if (error) return error

  const body = await request.json() as {
    task_text?: string
    due_date?: string
    client_id?: string
  }
  const taskText = body.task_text?.trim()
  if (!taskText) {
    return NextResponse.json({ error: 'Task text is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: newTask, error: insertError } = await supabase
    .from('tasks')
    .insert({
      counselor_id: target!.id,
      client_id: body.client_id || null,
      task_text: taskText,
      due_date: body.due_date || null,
      status: 'pending',
      assigned_by: admin.id,
    })
    .select('id, task_text, due_date, status')
    .single()

  if (insertError || !newTask) {
    console.error('[admin/counselors/tasks] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }

  await createNotification({
    counselorId: target!.id,
    type: 'task_assigned',
    title: `New task from ${admin.name}`,
    body: taskText,
    taskId: newTask.id,
    clientId: body.client_id || undefined,
  })

  const description = `${admin.name} assigned a task to ${target!.name}: "${taskText.slice(0, 80)}${taskText.length > 80 ? '…' : ''}"`
  if (body.client_id) {
    await logActivity({
      clientId: body.client_id,
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: 'task_assigned',
      description,
      metadata: { taskId: newTask.id, assignedTo: target!.id },
    })
  } else {
    await logStaffActivity({
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: 'task_assigned',
      description,
      metadata: { taskId: newTask.id, assignedTo: target!.id },
    })
  }

  return NextResponse.json({ success: true, task: newTask, assignedToName: target!.name })
}
```

`client_id` is accepted but there's no UI for it in v1 (see §5) — wire it up later if
you want "assign a task tied to this specific client" from the client detail page.

---

## 4. CEO's list of Branch Managers (assignment targets)

**File:** `src/lib/admin/getBranchManagersWithCounts.ts` (new) — mirrors
`getCounselorsWithCounts.ts`, but for `role = 'admin'`, always unscoped (only CEO calls
this), and includes branch name since CEO manages multiple branches.

```ts
import { createAdminClient } from '@/lib/supabase/server'

export type BranchManagerWithCounts = {
  id: string
  name: string
  email: string
  phone: string | null
  branchName: string | null
  openTaskCount: number
}

export async function getBranchManagersWithCounts(): Promise<BranchManagerWithCounts[]> {
  const supabase = createAdminClient()

  const [{ data: admins }, { data: pendingTasks }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, name, email, phone, branches(name)')
      .eq('role', 'admin')
      .eq('status', 'active')
      .order('name'),
    supabase.from('tasks').select('counselor_id').eq('status', 'pending'),
  ])

  const openTasksByStaff = new Map<string, number>()
  for (const task of pendingTasks ?? []) {
    if (!task.counselor_id) continue
    openTasksByStaff.set(task.counselor_id, (openTasksByStaff.get(task.counselor_id) ?? 0) + 1)
  }

  return (admins ?? []).map((a) => {
    const branch = a.branches as { name: string } | null
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      branchName: branch?.name ?? null,
      openTaskCount: openTasksByStaff.get(a.id) ?? 0,
    }
  })
}
```

Note: this needs `counselors.branch_id` → `branches` to resolve via the implicit FK
Supabase infers. If it errors with an ambiguous-relationship message (unlikely here
since `admins` aren't joined through `clients`), disambiguate with
`branches!counselors_branch_id_fkey(name)` the same way `src/lib/supabase/
relations.ts` does for the clients↔counselors join.

---

## 5. Assign Task modal + button

**File:** `src/components/admin/AssignTaskModal.tsx` (new) — mirrors
`TransferModal.tsx`'s structure and styling exactly:

```tsx
'use client'

import { type FormEvent, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  targetId: string
  targetName: string
  onClose: () => void
  onSuccess: () => void
}

export function AssignTaskModal({ targetId, targetName, onClose, onSuccess }: Props) {
  const [taskText, setTaskText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!taskText.trim()) {
      setError('Please describe the task')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/counselors/${targetId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_text: taskText.trim(),
          due_date: dueDate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to assign task')
        return
      }
      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-[420px] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="assign-task-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="assign-task-modal-title" className="text-lg font-bold text-white">
            Assign task to {targetName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-text" className="mb-1.5 block text-sm text-white/70">
              Task
            </label>
            <textarea
              id="task-text"
              value={taskText}
              rows={3}
              maxLength={500}
              placeholder="e.g. Follow up on outstanding documents for..."
              onChange={(e) => setTaskText(e.target.value)}
              className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none glass-input"
              required
            />
          </div>

          <div>
            <label htmlFor="task-due" className="mb-1.5 block text-sm text-white/70">
              Due date (optional)
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="min-h-[48px] w-full rounded-full px-4 py-2.5 text-sm outline-none glass-input"
            />
          </div>

          {error && <p className="text-sm text-orange">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !taskText.trim()}
              className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : 'Assign task →'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full py-2 text-sm text-white/50 transition-opacity hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**File:** `src/components/admin/AssignTaskButton.tsx` (new) — small self-contained
client component so each staff card in `/admin/team` can own its own modal state
without lifting state up into the server page:

```tsx
'use client'

import { useState } from 'react'
import { AssignTaskModal } from './AssignTaskModal'

type Props = { targetId: string; targetName: string }

export function AssignTaskButton({ targetId, targetName }: Props) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
      >
        Assign Task
      </button>
      {open && (
        <AssignTaskModal
          targetId={targetId}
          targetName={targetName}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false)
            setToast(true)
            setTimeout(() => setToast(false), 3000)
          }}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-grad-blue crisp-on-dark px-5 py-3 text-sm font-medium text-white shadow-lg">
          Task assigned to {targetName}
        </div>
      )}
    </>
  )
}
```

---

## 6. Wire the button into `/admin/team`

**File:** `src/app/(admin)/admin/team/page.tsx`

Add the import:
```ts
import { AssignTaskButton } from '@/components/admin/AssignTaskButton'
import { getBranchManagersWithCounts } from '@/lib/admin/getBranchManagersWithCounts'
```

Add `<AssignTaskButton targetId={counselor.id} targetName={counselor.name} />` inside
each counselor `<article>` card, right after the "View Dashboard" link.

Then, CEO-only, add a new section listing Branch Managers with the same button. After
the existing counselors block and before `<CounselorAccountsPanel .../>`, add:

```tsx
{admin.role === 'ceo' && (
  <>
    <hr className="border-white/10" />
    <BranchManagersSection />
  </>
)}
```

Where `BranchManagersSection` is an inline async server component in the same file
(or its own file if you'd rather keep the page shorter):

```tsx
async function BranchManagersSection() {
  const branchManagers = await getBranchManagersWithCounts()
  return (
    <div>
      <h2 className="text-xl font-semibold text-white">Branch Managers</h2>
      <p className="mt-1 text-sm text-white/60">
        {branchManagers.length} active branch manager{branchManagers.length === 1 ? '' : 's'}
      </p>
      {branchManagers.length === 0 ? (
        <p className="mt-6 text-sm text-white/50">No branch managers found.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branchManagers.map((bm) => (
            <article
              key={bm.id}
              className="flex flex-col rounded-2xl border border-white/10 glass-card crisp-on-dark p-5"
            >
              <h3 className="text-lg font-bold text-white">{bm.name}</h3>
              {bm.branchName && <p className="text-xs text-white/40">{bm.branchName}</p>}
              <p className="mt-3 text-sm text-white/60">{bm.email}</p>
              {bm.phone && <p className="text-sm text-white/60">{bm.phone}</p>}
              <p className="mt-4 text-sm font-medium text-white/70">
                {bm.openTaskCount} open task{bm.openTaskCount === 1 ? '' : 's'}
              </p>
              <AssignTaskButton targetId={bm.id} targetName={bm.name} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 7. Admin's own task inbox — `/admin/my-tasks`

Needed so an Admin has somewhere to see tasks the CEO assigned them. This is the one
piece with no admin-side precedent — everything else reuses existing patterns.

**File:** `src/app/(admin)/admin/my-tasks/page.tsx` (new)

```tsx
import { CounselorTasksView } from '@/components/dashboard/CounselorTasksView'

export default function AdminMyTasksPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-white md:text-3xl">My Tasks</h1>
      <CounselorTasksView tasksApiUrl="/api/tasks" />
    </main>
  )
}
```

That's the entire page — `CounselorTasksView` is already generic (takes a
`tasksApiUrl` prop, no counselor-specific routing baked in), and `GET /api/tasks`,
`POST /api/tasks/update`, and `POST /api/tasks/[taskId]/actions` all key off
`getAuthenticatedCounselor()` identity rather than role, so status updates and notes
work immediately for an Admin with zero further backend changes.

**File:** `src/components/admin/AdminSidebar.tsx`

Add a nav item (`CheckSquare` icon — new import from `lucide-react`) to the main
`navItems` array, near the top so it's easy to find:
```ts
import { CheckSquare } from 'lucide-react' // add to existing import
```
```ts
const navItems: NavItem[] = [
  { href: '/admin/my-tasks', label: 'My Tasks', icon: CheckSquare },   // <-- new, first item
  { href: '/admin/unassigned', label: 'Unassigned', icon: Users, badge: 'unassigned' },
  ...
```
Visible to both `admin` and `ceo` — harmless if empty, and keeps this future-proof if
you ever want CEOs to be assignable too.

---

## Test checklist

- [ ] Branch Manager sees "Assign Task" only on counselors in their own branch (no
      Branch Managers section — CEO-only)
- [ ] Branch Manager assigning to a counselor in a *different* branch (via direct API
      call with someone else's ID) → 403
- [ ] CEO sees both Counselors (all branches) and a new Branch Managers section, both
      with working Assign Task buttons
- [ ] Assigned counselor gets a notification, sees the task on `/dashboard/tasks`, can
      change its status and add notes as normal
- [ ] Assigned Branch Manager gets a notification, sees the task on `/admin/my-tasks`,
      can change its status and add notes
- [ ] Activity log (`/admin/staff-activity` for CEO) shows the assignment with actor
      and recipient names
- [ ] `GET /api/admin/counselors/[counselorId]/tasks` — confirm a Branch Manager can no
      longer fetch a counselor's tasks from a different branch (the scoping fix)
