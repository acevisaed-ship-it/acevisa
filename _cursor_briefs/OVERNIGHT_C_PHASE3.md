# OVERNIGHT C — Phase 3: Admin Intelligence Panel
## AceVisa.co | Run after OVERNIGHT_B is complete

Read PROJECT_CONTEXT.md before starting.

Build all 4 admin panel features. After each feature: `npm run build`. After all features: `vercel --prod`.

Admin panel base route: `/admin`
Admin IDs for testing: admin@acevisa.co / 2365c12c-8ad8-4cff-a45d-98137019f1d2

---

## FEATURE 1 — Knowledge Base Manager

**Route:** `/admin/knowledge-base`

**What it is:** Admin can add, edit, and deactivate knowledge base entries that the AI uses when answering student questions in chat. Currently the AI chat says "Knowledge base is currently empty." This panel fills it.

**DB table:** `knowledge_base` (already exists) with columns: `id`, `category`, `topic`, `answer`, `is_active`, `created_at`

**UI to build:**

Page layout:
- Header: "Knowledge Base" + "Add Entry" button (top right)
- Filter bar: dropdown to filter by category (Study Visa, Work Abroad, Visit & Immigration, Language & IELTS, General)
- Table/list of existing entries: category tag, topic (bold), answer (truncated to 100 chars), active/inactive toggle, edit button, delete button

Add/Edit form (modal or inline):
- Category: dropdown (Study Visa / Work Abroad / Visit & Immigration / Language & IELTS / General)
- Topic: text input (e.g. "UK blocked account requirement")
- Answer: textarea (the full answer the AI should give)
- Active: toggle (default on)
- Save button

**API routes to create:**
- `GET /api/admin/knowledge-base` — fetch all entries ordered by category
- `POST /api/admin/knowledge-base` — create new entry
- `PATCH /api/admin/knowledge-base/[id]` — update entry
- `DELETE /api/admin/knowledge-base/[id]` — set is_active = false (soft delete)

**Pre-populate 10 entries via SQL after building the UI:**

```sql
INSERT INTO knowledge_base (category, topic, answer, is_active) VALUES
  ('Study Visa', 'UK blocked account requirement', 'UK student visas require a bank statement showing you can cover your first years tuition plus 9 months living costs at 1334 GBP per month. This must be shown for 28 consecutive days before applying.', true),
  ('Study Visa', 'Germany blocked account 2025', 'Germany requires a blocked account of 11208 EUR to show you can support yourself for one year. The money is released monthly after arrival. This is separate from tuition and is a visa requirement.', true),
  ('Study Visa', 'Canada study permit processing time', 'Canada study permit processing from Pakistan currently takes 8 to 16 weeks on average. Student Direct Stream SDS is not available from Pakistan. Apply as early as possible before your intake.', true),
  ('Study Visa', 'Australia student visa subclass 500', 'Australia student visa requires proof of enrollment, financial capacity, English proficiency, and genuine temporary entrant GTE statement. Processing takes 4 to 8 weeks. Health insurance OSHC is mandatory.', true),
  ('Study Visa', 'Hungary upfront university fee', 'Most Hungarian universities require full first semester or first year tuition to be paid before the visa is issued. This is 3000 to 8000 EUR depending on the university, paid before you have a visa guarantee.', true),
  ('Work Abroad', 'UAE work visa requirements', 'UAE employment visa is sponsored by the employer. You need a valid job offer first. Processing takes 2 to 4 weeks. No IELTS required but most employers require English proficiency.', true),
  ('Work Abroad', 'Canada work permit pathways', 'Canada work permits include employer-specific work permits requiring LMIA, and open work permits for spouses of skilled workers or international students. Processing varies from 2 weeks to 6 months.', true),
  ('Language & IELTS', 'IELTS minimum scores by country', 'UK universities typically require IELTS 6.0 to 6.5. Canada requires 6.0 to 6.5 for most programs. Germany accepts IELTS 6.0 for most public universities. Australia requires 6.0 to 6.5 for undergraduate and 6.5 for postgraduate.', true),
  ('Language & IELTS', 'IELTS preparation timeline', 'Most students improve by 0.5 to 1 band per month of focused preparation. Plan for 2 to 3 months minimum if starting from scratch. ACE offers IELTS coaching as a standalone service before the visa process begins.', true),
  ('General', 'ACE service fee structure', 'ACE charges a service fee that is split into stages. An initial consultation is free with no commitment. Service fees are charged only when you decide to proceed. No upfront full payment is required. All costs are disclosed before you sign anything.', true)
ON CONFLICT DO NOTHING;
```

---

## FEATURE 2 — Campaign Manager

**Route:** `/admin/campaigns`

**What it is:** Admin creates and manages campaigns. Each campaign has a unique ad source code that gets appended to the landing page URL (e.g. `acevisa.co/?src=meta_uk_2024`). When a student registers through that URL, their `ad_source` is set to the campaign code. The AI uses campaign context to personalize its opening message.

**DB table:** `campaigns` (already exists) with columns: `id`, `campaign_name`, `ad_source_code`, `opening_line`, `context_hint`, `target_country`, `target_service`, `default_counselor_id`, `is_active`, `created_at`

**UI to build:**

Page layout:
- Header: "Campaigns" + "New Campaign" button
- Table: campaign name, ad source code (as a copyable badge), target country, assigned counselor (or "Admin Pool"), active toggle, edit button

New/Edit campaign form (modal):
- Campaign Name: text (e.g. "UK Study — Meta August 2025")
- Ad Source Code: text, no spaces, auto-lowercase (e.g. `meta_uk_aug2025`)
- Opening Line: textarea — the first message the AI sends to this student (can include `[name]` placeholder)
- Context Hint: text — a note for the AI about what this student is interested in
- Target Country: text (optional)
- Target Service: dropdown (Study Visa / Work Abroad / Visit & Immigration / Language & IELTS)
- Assign to Counselor: dropdown of active counselors + "Admin Pool" option
- Active: toggle

**Generated URL display:** After saving, show the full landing page URL with the src parameter: `https://acevisa.co/?src=[ad_source_code]` with a copy button.

**API routes:**
- `GET /api/admin/campaigns` — fetch all
- `POST /api/admin/campaigns` — create
- `PATCH /api/admin/campaigns/[id]` — update
- `PATCH /api/admin/campaigns/[id]/toggle` — toggle is_active

No delete — only deactivate.

---

## FEATURE 3 — Counselor Performance Dashboard

**Route:** `/admin/performance`

**What it is:** Admin sees a summary of each counselor's key metrics. All data is derived from existing tables — no new DB columns needed.

**Metrics to show per counselor (calculate from DB):**
- Total active clients
- Meetings this month (scheduled + completed)
- Average response time (from `response_tracking` table, avg of `response_time_seconds` where `response_by = 'counselor'`)
- Open tasks count
- Negligence flags count (from `tasks` where `negligence_flagged = true`)
- Conversion rate: clients with `qualification_score >= 7` / total clients (percentage)

**UI to build:**

Page layout:
- Header: "Team Performance" + month selector (default current month)
- One card per counselor showing all 6 metrics above
- Sort by: conversion rate (default), response time, active clients
- Flag indicator: if a counselor has negligence_flagged tasks > 0, show a red "Needs Attention" badge on their card

**API route:**
- `GET /api/admin/performance?month=2025-06` — returns array of counselor performance objects

Calculate all metrics server-side in this API route using Supabase queries.

---

## FEATURE 4 — HR Flags Panel

**Route:** `/admin/hr-flags`

**What it is:** Admin sees a consolidated view of all negligence flags and slow response issues requiring HR attention.

**Data sources:**
- `tasks` where `negligence_flagged = true` — grouped by counselor
- `response_tracking` where `response_time_seconds > 86400` (more than 24 hours) — grouped by counselor
- `complaints` where `status = 'open'` — grouped by counselor

**UI to build:**

Page layout:
- Header: "HR Flags"
- Three sections with counts in headers:

Section 1 — Negligence Flags
Table: counselor name, client name, task title, flagged date, action button ("Mark Resolved" → sets negligence_flagged = false)

Section 2 — Slow Responses (>24h)
Table: counselor name, client name, student message time, response time in hours, response date

Section 3 — Open Complaints
Table: client name, subject, submitted date, counselor name, "View" button linking to the complaint detail

- Empty state for each section if no flags

**API routes:**
- `GET /api/admin/hr-flags` — returns { negligenceFlags, slowResponses, openComplaints }
- `PATCH /api/admin/tasks/[taskId]/resolve-flag` — sets negligence_flagged = false

---

## DONE WHEN

- [ ] `/admin/knowledge-base` loads and shows entry list
- [ ] Can add a new knowledge base entry and it saves to DB
- [ ] Knowledge base entries are now returned in chat (test by asking the AI "UK bank statement kitna chahiye")
- [ ] `/admin/campaigns` loads with existing campaigns
- [ ] Can create a new campaign and the generated URL shows correctly
- [ ] `/admin/performance` loads with one card per counselor
- [ ] Metrics calculate from real DB data (not hardcoded)
- [ ] `/admin/hr-flags` loads with three sections
- [ ] Negligence flag resolution works
- [ ] `npm run build` passes
- [ ] `vercel --prod` deployed

## NEXT STEP
Open `_cursor_briefs/OVERNIGHT_D_PHASE4.md` in a new Cursor agent window and begin immediately.
