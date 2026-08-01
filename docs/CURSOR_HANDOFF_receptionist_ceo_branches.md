# Handoff: Receptionist / CEO / Branch Manager roles

Written by Claude (architecture + implementation), to be picked up and finished by Cursor.
Everything below already exists on disk, uncommitted, in this repo. Nothing has been
pushed or deployed.

---

## 0. First, unblock git

`.git/index.lock` was stuck when this was written (something — likely an editor's git
integration — had a handle on it). Before anything else:

1. Close any other editor/Git GUI/terminal that has this repo open.
2. If `E:\GIT\Portal\acevisa\.git\index.lock` still exists, delete it manually.
3. `git status` to confirm it's clear, then review the diff before committing anything.

---

## 1. What this feature does

Four account types now exist instead of two:

- **`ceo`** (Super Admin) — sees everything, every branch, every role, unscoped. No
  branch_id (null = global).
- **`admin`** (Branch Manager — same DB role value as before, just relabeled in the UI)
  — scoped to their own `branch_id`.
- **`counselor`** — unchanged behavior, now also carries a `branch_id`.
- **`receptionist`** — new. Exactly one capability: register a new client (student)
  directly, with a preset password, and nothing else. No dashboard, no client list, no
  other data access.

Every client now gets a human-readable ID: `AV-000001`, `AV-000002`, ... (sequential,
zero-padded 6 digits, `AV-` prefix). Shown on the client record, searchable in the All
Clients table, and included in the student's welcome email so counselors and the
student can both reference it quickly.

**Design decision — role check constraint:** `counselors.role` has no CHECK constraint
in the DB (verified before writing the migration), so adding `'receptionist'` and
`'ceo'` as values required no schema constraint change — just application code that
recognizes them.

**Design decision — CEO reuses the Admin panel wholesale.** Rather than building a
separate CEO app, `requireAdminApi()` / `requireAdmin()` were widened to accept
`role IN ('admin', 'ceo')`. Every existing `/admin/*` page and API route CEO touches
already returns global (unscoped) data by default, so CEO automatically got "sees
everything" for free across all ~30 admin pages — finance, CRM, HR, invoices,
everything — without touching those files individually. The work that *was* needed
was the opposite: adding branch filtering so `admin` (Branch Manager) sees **less**
than before. See §4 for what's scoped and what isn't yet.

**Design decision — WhatsApp deferred.** No Twilio/WhatsApp integration existed in the
codebase and the Twilio env vars in `.env.local` are empty. The welcome message is
email-only (via Resend, already working) for now. Revisit when WhatsApp Business API
credentials exist.

---

## 2. Files created

| File | Purpose |
|---|---|
| `supabase/migrations/20260801000000_branches_roles_receptionist_ceo.sql` | `branches` table; `counselors.branch_id`; `clients.branch_id`, `.client_code` (sequence-backed, backfilled), `.registered_by`; `activity_logs.actor_role` |
| `src/lib/receptionist/requireReceptionistApi.ts` | API guard — role must be exactly `receptionist` |
| `src/app/receptionist/layout.tsx` | Page guard (`requireReceptionist`) + minimal header, no sidebar |
| `src/app/receptionist/page.tsx` | The one page a receptionist sees |
| `src/components/receptionist/ReceptionistHeader.tsx` | Header w/ sign out |
| `src/components/receptionist/ReceptionistRegisterForm.tsx` | The registration form (name/phone/email/city/language/interested_in/target_country) |
| `src/app/api/receptionist/register-client/route.ts` | Creates client + Supabase Auth user with **preset password** (not magic-link), assigns `client_code`, sends welcome email, logs activity |
| `src/app/(admin)/admin/branches/page.tsx` + `src/components/admin/BranchesManager.tsx` | CEO-only: list branches, create new ones |
| `src/app/api/admin/branches/route.ts` | GET (any admin-panel role, for dropdowns) / POST (CEO only) |
| `src/app/(admin)/admin/staff-activity/page.tsx` | CEO-only global activity feed (reuses `ActivityLogView`) |

## 3. Files modified

| File | Change |
|---|---|
| `src/lib/supabase/server.ts` | `branch_id` added to counselor selects; `requireAdmin`/`getAuthenticatedAdmin` now accept `ceo` too; added `requireCeo()`, `requireReceptionist()`, `isBranchScoped()` helper |
| `src/lib/admin/requireAdminApi.ts` | Accepts `ceo`; added `requireCeoApi()` |
| `src/middleware.ts` | Routes `receptionist` → `/receptionist`, `ceo` → `/admin` (same as admin) |
| `src/lib/activityLog.ts` | `clientId` now optional; added `actorRole` field and `logStaffActivity()` helper for non-client staff events (logins, account creation, etc.) |
| `src/lib/email.ts` | Added `studentWelcomeEmailHtml()` template |
| `src/app/api/admin/counselors/create/route.ts` | Accepts `role` + `branchId`. Branch Managers can only create `counselor`/`receptionist` (forced into their own branch). CEO can also create `admin` and pick any branch. |
| `src/components/admin/CounselorAccountsPanel.tsx` | Added role + (CEO-only) branch dropdowns to the create-staff form |
| `src/components/admin/AdminSidebar.tsx` + `AdminShell.tsx` + `AdminLayoutClient.tsx` | Thread `adminRole` through; CEO gets two extra nav items (Branches, Staff Activity); sidebar label shows "Branch Manager" / "Super Admin (CEO)" instead of "Admin" |
| `src/app/(admin)/admin/layout.tsx`, `clients/page.tsx`, `unassigned/page.tsx`, `team/page.tsx`, `counselors/page.tsx` | Branch-scoped queries for `admin` role (see §4) |
| `src/app/api/admin/meetings/route.ts`, `src/app/api/admin/counselors/route.ts`, `src/app/api/admin/unassigned-count/route.ts` | Same branch-scoping, API side |
| `src/components/admin/AllClientsTable.tsx` | Shows + searches `client_code` |

---

## 4. Branch-scoping status — what Cursor needs to finish

**Scoped already** (Branch Manager sees only their branch; CEO sees all):
clients (list, unassigned), counselors/team list, meetings.

**NOT scoped yet — still global for everyone including Branch Manager:**
finance, invoices, CRM deals, HR (attendance/leave/policies/analytics), campaigns,
products, incentive, team-commission, knowledge base, team hub, escalations,
complaints, tasks, performance, `/admin/activity` (the non-CEO activity log page).

To scope any of these, follow the exact pattern already used in
`src/app/api/admin/meetings/route.ts` and `src/app/(admin)/admin/clients/page.tsx`:

```ts
const { admin, error } = await requireAdminApi() // or requireAdmin() in a page
if (error) return error

let query = supabase.from('TABLE').select(...)
if (admin.role === 'admin') {
  query = query.eq('branch_id', admin.branch_id) // if TABLE has branch_id directly
  // or, if TABLE only has client_id (e.g. meetings, tasks, complaints):
  // .select('..., clients!inner(branch_id)').eq('clients.branch_id', admin.branch_id)
}
```

Tables that need a `branch_id` column added before they can be scoped this way:
`deals` (CRM), `invoices`, `expenses`, `hr_flags`/attendance/leave tables, `campaigns`,
`products`. Everything else derives branch through its `client_id` or `counselor_id`
foreign key (join and filter, as shown above) — no new column needed.

Recommend doing this module-by-module, cheapest/highest-value first: campaigns and
CRM deals (clear business ownership per branch) before finance/HR (more sensitive,
worth a deliberate decision on whether Branch Managers should even see their own
branch's payroll, or whether that stays CEO-only regardless of branch).

---

## 5. Before merging to `main`

1. Run the migration SQL (`20260801000000_branches_roles_receptionist_ceo.sql`) in the
   Supabase SQL editor. **Do this before deploying app code** — the new code reads/
   writes columns that don't exist until the migration runs.
2. Manually create at least one `ceo` row in `counselors` (there's no UI to create the
   first CEO — bootstrap it directly in the DB, then that account can create everyone
   else). Something like:
   ```sql
   update counselors set role = 'ceo', branch_id = null where email = 'you@acevisa.co';
   ```
3. `npm run build` — this was never verified in this session (the sandbox's access to
   this repo was too slow for `tsc`/`npm run build` to finish in time). Treat it as
   unverified until Cursor runs it.
4. Smoke test each role: login as receptionist → register a client → confirm email
   arrives with `AV-` ID + working password → login as that student. Login as a
   Branch Manager → confirm they only see their branch's clients/team/meetings. Login
   as CEO → confirm they see everything plus Branches + Staff Activity nav items.
5. Push to `dev`, verify on the Vercel preview deploy, then merge to `main`.
