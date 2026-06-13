# Cursor Agent — Admin QA Automation Command

> **How to use:** Open Cursor, press Cmd/Ctrl+I (Agent mode), paste this entire file's
> content into the prompt, and press Enter. Cursor will run the checks, fix what it
> can in code, and return a list of the items that **only a human can test**.

---

## YOUR TASK

You are auditing the ACE Altius Consulting portal (Next.js 16 App Router, Supabase, Tailwind v4).
The project root is the current workspace. Work through the steps below in order.

---

## STEP 1 — BUILD & TYPE CHECK

Run these commands and collect all errors. Do NOT stop on first failure — run all three.

```bash
npx tsc --noEmit 2>&1
npx eslint src --ext .ts,.tsx --max-warnings 0 2>&1
npx next build 2>&1
```

For every error found:
- If it is a TypeScript type error → fix it in the source file.
- If it is an ESLint rule violation → fix it.
- If it is a missing import or wrong path → fix the import.
- If it is a `next build` error (missing page, bad export) → fix the file.

Re-run all three commands after fixes until all pass. Report what you fixed.

---

## STEP 2 — ADMIN PAGE FILE EXISTENCE

Verify that each of these route files exists (as `page.tsx` or `route.ts`).
If a file is missing, create a minimal placeholder page that renders the section
heading and "Coming soon" rather than crashing.

| Route | Expected file |
|---|---|
| `/admin` | `src/app/(admin)/admin/page.tsx` |
| `/admin/clients` | `src/app/(admin)/admin/clients/page.tsx` |
| `/admin/clients/[clientId]` | `src/app/(admin)/admin/clients/[clientId]/page.tsx` |
| `/admin/complaints` | `src/app/(admin)/admin/complaints/page.tsx` |
| `/admin/escalations` | `src/app/(admin)/admin/escalations/page.tsx` |
| `/admin/meetings` | `src/app/(admin)/admin/meetings/page.tsx` |
| `/admin/activity` | `src/app/(admin)/admin/activity/page.tsx` |
| `/admin/hrm` | `src/app/(admin)/admin/hrm/page.tsx` |
| `/admin/team` | `src/app/(admin)/admin/team/page.tsx` |
| `/admin/settings` | `src/app/(admin)/admin/settings/page.tsx` |
| `/admin/knowledge-base` | `src/app/(admin)/admin/knowledge-base/page.tsx` |
| `/admin/campaigns` | `src/app/(admin)/admin/campaigns/page.tsx` |
| `/admin/performance` | `src/app/(admin)/admin/performance/page.tsx` |
| `/admin/hr-flags` | `src/app/(admin)/admin/hr-flags/page.tsx` |
| `/admin/crm` | `src/app/(admin)/admin/crm/page.tsx` |
| `/admin/finance` | `src/app/(admin)/admin/finance/page.tsx` |

---

## STEP 3 — API ROUTE EXISTENCE & EXPORTS

Verify each API route file exists AND exports the correct HTTP method handlers.
Fix any that are missing the required export.

| File | Required exports |
|---|---|
| `src/app/api/admin/invoices/route.ts` | `GET`, `POST` |
| `src/app/api/admin/invoices/[id]/payment/route.ts` | `POST` |
| `src/app/api/admin/invoices/[id]/status/route.ts` | `PATCH` |
| `src/app/api/admin/expenses/route.ts` | `GET`, `POST`, `DELETE` |
| `src/app/api/admin/finance/summary/route.ts` | `GET` |
| `src/app/api/admin/finance/export/route.ts` | `GET` |
| `src/app/api/admin/complaints/route.ts` | `GET` (or `POST`) |
| `src/app/api/admin/escalations/route.ts` | `GET` |
| `src/app/api/admin/team/route.ts` | `GET`, `POST`, `PATCH` |
| `src/app/api/admin/settings/route.ts` | `GET`, `PATCH` |
| `src/app/api/admin/clients/route.ts` | `GET` |
| `src/app/api/admin/clients/[clientId]/assign/route.ts` | `PATCH` or `POST` |
| `src/app/api/documents/upload/route.ts` | `POST` |
| `src/app/api/documents/[documentId]/download/route.ts` | `GET` |
| `src/app/api/documents/request/route.ts` | `POST` |
| `src/app/api/ai/behavioral-analysis/route.ts` | `GET`, `POST` |

---

## STEP 4 — COMPONENT IMPORT VALIDATION

Read each of the following components and verify every import they reference resolves
to a real file. Fix any broken imports.

- `src/components/admin/InvoiceManager.tsx`
- `src/components/admin/FinanceSummary.tsx`
- `src/components/admin/HRMView.tsx`
- `src/components/admin/TeamManagement.tsx`
- `src/components/admin/AdminSettings.tsx`
- `src/components/brief/BehavioralNotesSection.tsx`
- `src/components/brief/DocumentsChecklistSection.tsx`
- `src/components/CopyPortalLink.tsx`

---

## STEP 5 — ADMIN SIDEBAR NAVIGATION LINKS

Read the admin sidebar component (search for it under `src/components/admin/` or
`src/app/(admin)/`). Extract every `href` value used in nav links.
For each href, verify the corresponding `page.tsx` exists.
If any link points to a non-existent page, either create the placeholder page
(preferred) or flag it clearly in your report.

---

## STEP 6 — ENVIRONMENT VARIABLE REFERENCES

Search the entire `src/` directory for these env var names. For each one found,
confirm it is referenced correctly (via `process.env.VAR_NAME`).
Report any that are used but not present in `.env.example` or `.env.local`
(do NOT read actual secret values — just check the names are used consistently).

Required vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY`

---

## STEP 7 — SQL MIGRATION SYNTAX CHECK

Read all `.sql` files under `supabase/migrations/`. For each file:
- Confirm the file is not empty.
- Check for obvious SQL syntax issues (unmatched parentheses, missing semicolons
  at statement ends, references to columns or tables that don't appear in prior
  migrations).
- Report any issues found (do NOT run the SQL yourself — just static analysis).

---

## STEP 8 — SETTINGS PERSISTENCE CODE REVIEW

Read `src/components/admin/AdminSettings.tsx`.
Verify:
1. It fetches settings from `/api/admin/settings` on mount via `useEffect`.
2. It has a loading guard before rendering toggles (so it doesn't flash defaults).
3. The Save button calls PATCH on `/api/admin/settings`.
Fix any of the above that are missing.

---

## STEP 9 — EXCEL EXPORT PACKAGE CHECK

Read `package.json`. Confirm `xlsx` is listed under `dependencies`.
If it is missing, add `"xlsx": "^0.18.5"` to dependencies and inform the user
to run `npm install`.

---

## STEP 10 — FINAL BUILD VERIFICATION

Run `npx next build` one final time. It must complete with zero errors.
If it still has errors, fix them.

---

## STEP 11 — OUTPUT YOUR REPORT

When all steps above are complete, output a report in this exact format:

```
## CURSOR QA REPORT — ADMIN

### Automated checks passed ✅
- [list each check that passed]

### Issues found and fixed 🔧
- [describe each fix made, with file name]

### Issues found but NOT fixable by code alone ⚠️
- [describe any issues that need manual intervention with context]

---

## MANUAL TESTING REQUIRED — ADMIN
The following items from the admin QA checklist CANNOT be verified by code analysis.
A human must test these in a real browser with live data.

### Authentication & Session
- [ ] Login with admin email/password at `/login` → lands on `/admin` with no error.
- [ ] Direct URL access to `/admin/clients` while logged in → page loads (not redirected).
- [ ] Open `/admin` in a new tab while already logged in → still logged in.

### Analytics Dashboard (/admin)
- [ ] All 8+ KPI cards load with real values (not all zeros if DB has data).
- [ ] Unassigned clients card shows warning colour when count > 0.

### Clients (/admin/clients)
- [ ] Assign dropdown on an unassigned client → select counselor → assignment persists on refresh.
- [ ] Client detail page: pipeline stage dropdown → change → refresh → persists.
- [ ] Client detail page: notes field → save → refresh → persists.
- [ ] Copy portal link button → shows "Copied!" → paste in new tab → opens client portal.
- [ ] Documents with status "Uploaded" show a View button → clicking opens file in new tab.
- [ ] Pending profile updates banner appears and Approve/Reject buttons work.

### Complaints (/admin/complaints)
- [ ] Filter buttons (All / Open / Acknowledged) filter the list.
- [ ] Expand a complaint (▼ chevron) → body text shows.
- [ ] Acknowledge button → status updates to Acknowledged.

### Escalations (/admin/escalations)
- [ ] Mark Resolved → escalation moves to Resolved tab.

### Meetings (/admin/meetings)
- [ ] Status filter works. Client name links open client detail page.

### Activity Log (/admin/activity)
- [ ] Log entries load. Load more button appends more entries.

### HRM (/admin/hrm)
- [ ] Month picker changes the table data.
- [ ] Commission table shows per-counselor breakdown.

### Team Management (/admin/team)
- [ ] Pencil icon → inline edit counselor name → green tick → name updates.
- [ ] Deactivate / Activate toggles work (do NOT deactivate your own account).
- [ ] Add Member form creates a new Supabase Auth user + counselor row.

### Settings (/admin/settings)
- [ ] Toggle a notification switch → Save → refresh → toggle stays in new position (DB persistence).
- [ ] Change session timeout value → Save → refresh → value persists.
- [ ] Change date format → Save → refresh → persists.

### Knowledge Base (/admin/knowledge-base)
- [ ] Add, edit, delete entries — all persist on refresh.

### Finance (/admin/finance)
- [ ] Client Invoices tab shows invoices with green ↑ IN badges.
- [ ] Expenses tab shows expenses with orange ↓ OUT badges.
- [ ] Record Expense form → submit → new row appears immediately.
- [ ] Export Excel buttons download valid .xlsx files that open in Excel/Sheets.
- [ ] Month picker on P&L summary changes the figures.
- [ ] Net = Collected − Expenses is arithmetically correct.

### Email Notifications (requires RESEND_API_KEY)
- [ ] Submit a student complaint → admin email receives notification within ~1 min.
- [ ] Client books a meeting → counselor email receives notification.
- [ ] AI escalation created → counselor email receives notification.

### Sidebar Navigation
- [ ] Every sidebar link navigates to the correct page without a 404.
- [ ] Logo has white background and is clearly readable on the dark sidebar.
- [ ] On mobile: hamburger opens drawer, all links work, tapping outside closes drawer.
- [ ] Notification bell icon is white and visible on the dark header.
```
