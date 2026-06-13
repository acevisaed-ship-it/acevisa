# Admin Testing Checklist
**URL:** https://acevisa.vercel.app
**Login:** go to `/login` and sign in with your admin account.
**Pass** = works as described. **Fail** = write what happened instead.

---

## 1. LOGIN & SESSION

- [ ] Go to `/login`. Enter admin email and password. Click **Sign in**.
  → Should land on `/admin` dashboard. No error message.

- [ ] While logged in, paste `/admin/clients` directly in the address bar and press Enter.
  → Should open clients page, not redirect to login.

- [ ] Open a new tab and go to `/admin`.
  → Should still be logged in (no re-login needed).

---

## 2. ANALYTICS DASHBOARD (`/admin`)

- [ ] Page loads without crashing.
- [ ] You see 8 KPI cards: Total Clients, Active Clients, Unassigned, Counselors, Open Complaints, Open Tasks, Overdue Tasks, Revenue This Month, Pipeline Value, Meetings This Month.
- [ ] If there are unassigned clients, the card shows an orange/red warning colour.
- [ ] Numbers are real values, not all zeros (unless the database is empty).

---

## 3. CLIENTS (`/admin/clients`)

- [ ] List of all clients loads. Each row shows name, phone, pipeline stage, counselor.
- [ ] Click the **Assign** dropdown on an unassigned client → select a counselor → page refreshes with counselor name showing.
- [ ] Click a client name → opens that client's detail page.

### Client Detail Page

- [ ] Client profile header shows name, phone, city, qualification score.
- [ ] **AI Profile Summary** section shows the AI-generated profile (may be empty if no chat yet).
- [ ] **Conversation Digest** section shows chat history (may be empty).
- [ ] **Service Pathway**, **Psychological Read**, **Talking Points** sections load (may show "no data" if profile not generated).
- [ ] **Documents Checklist** shows requested documents. If any are "Uploaded", a **View** button appears → click it → file opens in new tab.
- [ ] **Meetings History** section shows past and upcoming meetings.
- [ ] **Activity History** section shows a log of all actions taken for this client.
- [ ] **Pipeline stage** dropdown → change it → refresh the page → new stage is still selected.
- [ ] **Notes** field → type a note → click Save → refresh → note is still there.
- [ ] **Copy portal link** button (top right) → click it → button says "Copied!" → paste in a new tab → should open the client's portal page.
- [ ] **Pending profile updates** banner appears if the AI detected profile changes awaiting approval. Click Approve or Reject.

---

## 4. COMPLAINTS (`/admin/complaints`)

- [ ] Page loads with a list of complaints.
- [ ] Filter buttons (All / Open / Acknowledged) work — clicking each filters the list.
- [ ] Click the chevron (▼) on a complaint → body text expands.
- [ ] Click **Acknowledge** on an open complaint → status changes to Acknowledged in the list.

---

## 5. ESCALATIONS (`/admin/escalations`)

- [ ] Page loads with list of escalated client questions.
- [ ] Filter buttons (Open / Resolved / All) work.
- [ ] Click **Mark Resolved** on an open escalation → it moves to the Resolved tab.

---

## 6. ALL MEETINGS (`/admin/meetings`)

- [ ] Page loads with a table of all meetings across all counselors.
- [ ] Filter by status (Scheduled / Completed / Cancelled) works.
- [ ] Client names are clickable links → open that client's detail page.

---

## 7. ACTIVITY LOG (`/admin/activity`)

- [ ] Log entries load showing counselor name, client name, action type, time.
- [ ] Action type badges are colour-coded (e.g. "meeting_scheduled" is a different colour than "complaint_received").
- [ ] Click **Load more** → more entries appear below.

---

## 8. HRM — PAYROLL (`/admin/hrm`)

- [ ] Page loads with 3 cards: Base Salaries, Commissions, Total Payroll.
- [ ] Month picker (top right) → change to a different month → table updates.
- [ ] Per-counselor table shows commission rate, deals closed, deal value, commission earned.
- [ ] If no deals were closed this month, table shows "No commission data for this month" (expected — try a past month).

---

## 9. TEAM MANAGEMENT (`/admin/team`)

- [ ] Page loads with a table of all counselors and admins.
- [ ] Client count column shows how many clients each person is handling.
- [ ] Click the **pencil icon** next to a counselor → name becomes an editable field → change it → click the green tick → name updates in the table.
- [ ] Click **Deactivate** on a counselor → status changes to "inactive". Click **Activate** to reverse.
  ⚠️ Do not deactivate your own admin account.
- [ ] Click **Add Member** → form appears → fill in Name, Email, Password, Role → click Create → new row appears in the table.

---

## 10. SETTINGS (`/admin/settings`)

- [ ] Page loads with 4 tabs: Notifications, Security, Data, Appearance.
- [ ] **Notifications tab**: toggle any switch (e.g. "Weekly performance digest") → click **Save Changes** → refresh the page → the toggle should still be in the new position. (This confirms settings are saved to the database, not just local.)
- [ ] **Security tab**: change Session timeout value → Save → refresh → value persists.
- [ ] **Appearance tab**: change Date format dropdown → Save → refresh → selection persists.
- [ ] **Data tab**: "Export CSV" button is visible (functionality is a stub — clicking it is fine, no download expected yet).

---

## 11. KNOWLEDGE BASE (`/admin/knowledge-base`)

- [ ] Page loads with a list of AI knowledge entries.
- [ ] Click **Add Entry** (or equivalent button) → form appears → fill in category, topic, answer → save → new entry appears in the list.
- [ ] Click edit on an existing entry → change the answer → save → updated text shows.
- [ ] Click delete on an entry → confirmation → entry removed from list.

---

## 12. CAMPAIGNS (`/admin/campaigns`)

- [ ] Page loads with a list of campaigns.
- [ ] Each campaign shows name, status (active/inactive), channel.
- [ ] Toggle a campaign active/inactive → status updates.

---

## 13. PERFORMANCE (`/admin/performance`)

- [ ] Page loads with per-counselor performance stats (clients assigned, meetings completed, tasks done, open complaints).

---

## 14. HR FLAGS (`/admin/hr-flags`)

- [ ] Page loads with a list of flagged tasks (negligence flags raised when counselors are overdue).
- [ ] Resolve button on a flag clears it.

---

## 15. CRM / DEALS (`/admin/crm`)

- [ ] Page loads with deals pipeline.
- [ ] Each deal shows client name, stage, deal value, counselor.
- [ ] Can edit a deal's stage or value.

---

## 16. FINANCE (`/admin/finance`)

- [ ] Page loads with revenue and expense summary for the selected month.
- [ ] Income breakdown table lists paid invoices with client names and amounts.
- [ ] Expense breakdown shows categories (salary, rent, marketing, etc.).
- [ ] Net = Total Collected − Total Expenses is calculated correctly.
- [ ] Month picker changes the data.

---

## 17. EMAIL NOTIFICATIONS
> Requires `RESEND_API_KEY` set in Vercel. Skip if not configured.

- [ ] Submit a complaint as a student (see Client checklist) → admin email inbox receives an email with subject "New complaint — [client name]" within a minute.
- [ ] A counselor's client books a meeting → that counselor's email receives "New meeting booked — [client name]".
- [ ] A client's AI chat escalates → assigned counselor receives "Client question needs your input".

---

## 18. SIDEBAR NAVIGATION

- [ ] Every sidebar link works and loads the correct page.
- [ ] Logo is visible on the dark green sidebar (white background behind it).
- [ ] On mobile: hamburger menu opens a drawer with all nav links.
- [ ] Notification bell icon is visible and white on the dark header.
