# OVERNIGHT D — Phase 4: Financial Suite (Foundation)
## AceVisa.co | Run after OVERNIGHT_C is complete

Read PROJECT_CONTEXT.md before starting.

This phase builds the financial foundation. No external payment gateway needed. Everything is internal record-keeping.

After each feature: `npm run build`. After all: `vercel --prod`.

---

## NEW DB TABLES NEEDED

Run this SQL first before building any UI:

```sql
-- Service agreements / deals
CREATE TABLE IF NOT EXISTS deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  counselor_id uuid REFERENCES counselors(id),
  service_type text NOT NULL, -- 'study_visa' | 'work_abroad' | 'visit_immigration' | 'language_ielts'
  target_country text,
  deal_value numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  stage text NOT NULL DEFAULT 'lead', -- 'lead' | 'proposal' | 'agreement_signed' | 'in_progress' | 'completed' | 'lost'
  stage_notes text,
  signed_at timestamptz,
  expected_close_date date,
  actual_close_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id),
  counselor_id uuid REFERENCES counselors(id),
  line_items jsonb NOT NULL DEFAULT '[]', -- [{description, amount}]
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  status text NOT NULL DEFAULT 'draft', -- 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Payments received
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id),
  client_id uuid REFERENCES clients(id),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  payment_method text, -- 'bank_transfer' | 'cash' | 'easypaisa' | 'jazzcash' | 'other'
  reference_number text,
  paid_at timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES counselors(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL, -- 'salary' | 'office' | 'marketing' | 'tools' | 'other'
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  paid_at date NOT NULL,
  recorded_by uuid REFERENCES counselors(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Counselor commission rules
CREATE TABLE IF NOT EXISTS commission_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  counselor_id uuid REFERENCES counselors(id) UNIQUE,
  commission_rate numeric(5,2) NOT NULL DEFAULT 10, -- percentage
  base_salary numeric(10,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
```

---

## MOCK DATA — Insert after creating tables

```sql
-- Commission rules for counselors
INSERT INTO commission_rules (counselor_id, commission_rate, base_salary) VALUES
  ('55403943-35db-4c2b-94fe-02750ed04352', 12, 80000), -- Hashaam
  ('45f23418-fbb7-472c-b9e2-bddc7eac40ff', 10, 75000)  -- Aneeqa
ON CONFLICT (counselor_id) DO NOTHING;

-- Deals
INSERT INTO deals (id, client_id, counselor_id, service_type, target_country, deal_value, stage, signed_at, expected_close_date)
VALUES
  ('d4000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '55403943-35db-4c2b-94fe-02750ed04352', 'study_visa', 'UK', 95000, 'proposal', NULL, CURRENT_DATE + interval '30 days'),
  ('d4000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', '45f23418-fbb7-472c-b9e2-bddc7eac40ff', 'study_visa', 'Germany', 120000, 'agreement_signed', now() - interval '5 days', CURRENT_DATE + interval '60 days'),
  ('d4000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000002', '55403943-35db-4c2b-94fe-02750ed04352', 'language_ielts', 'N/A', 25000, 'lead', NULL, CURRENT_DATE + interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- Invoices
INSERT INTO invoices (id, invoice_number, client_id, deal_id, counselor_id, line_items, subtotal, total, status, due_date)
VALUES
  ('e5000001-0000-0000-0000-000000000001', 'ACE-2025-001', 'a1000001-0000-0000-0000-000000000003', 'd4000001-0000-0000-0000-000000000002', '45f23418-fbb7-472c-b9e2-bddc7eac40ff',
   '[{"description": "Germany Study Visa Service Fee - Stage 1", "amount": 40000}, {"description": "Documentation Processing", "amount": 15000}]'::jsonb,
   55000, 55000, 'sent', CURRENT_DATE + interval '7 days'),
  ('e5000001-0000-0000-0000-000000000002', 'ACE-2025-002', 'a1000001-0000-0000-0000-000000000002', 'd4000001-0000-0000-0000-000000000003', '55403943-35db-4c2b-94fe-02750ed04352',
   '[{"description": "IELTS Preparation Course - 2 months", "amount": 25000}]'::jsonb,
   25000, 25000, 'draft', CURRENT_DATE + interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- Expenses
INSERT INTO expenses (category, description, amount, paid_at, recorded_by)
VALUES
  ('salary', 'June 2025 salary - Hashaam', 80000, CURRENT_DATE - interval '5 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('salary', 'June 2025 salary - Aneeqa', 75000, CURRENT_DATE - interval '5 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('marketing', 'Meta ads - UK campaign June', 35000, CURRENT_DATE - interval '10 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('office', 'Office rent June 2025', 45000, CURRENT_DATE - interval '1 day', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('tools', 'Vercel + Supabase + Anthropic APIs', 8500, CURRENT_DATE - interval '3 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2');
```

---

## FEATURE 1 — CRM Pipeline

**Route:** `/admin/crm`

**What it is:** A Kanban-style view of all deals grouped by stage. Admin and counselors can drag deals between stages or update them.

**Stages (columns left to right):** Lead → Proposal → Agreement Signed → In Progress → Completed → Lost

**UI to build:**

- Horizontal scrolling kanban board
- Each column shows: stage name, count of deals, total value of deals in that stage
- Each deal card shows: client name, counselor name, service type, country, deal value in PKR
- Clicking a card opens a side panel with full deal details + option to change stage
- "New Deal" button: opens modal to create a deal linked to an existing client
- Filter bar: filter by counselor, by service type, by month

**API routes:**
- `GET /api/admin/crm/deals` — fetch all deals with client and counselor names joined
- `POST /api/admin/crm/deals` — create new deal
- `PATCH /api/admin/crm/deals/[dealId]` — update deal stage or details

---

## FEATURE 2 — Invoice Manager

**Route:** `/admin/invoices`

**What it is:** Admin creates and tracks invoices. When a deal moves to "Agreement Signed", admin generates an invoice.

**UI to build:**

Page layout:
- Header: "Invoices" + "New Invoice" button
- Filter tabs: All / Draft / Sent / Paid / Overdue
- Table: invoice number, client name, counselor, total amount, status badge, due date, actions (View, Mark Paid, Download)

New Invoice form (modal):
- Client: searchable dropdown
- Link to Deal: dropdown of deals for that client
- Line Items: repeating rows of description + amount (add/remove rows)
- Due Date: date picker
- Notes: optional textarea
- Auto-calculate: subtotal, total
- Save as Draft or Send (send just changes status to 'sent' — no email for now)

Mark as Paid:
- Button on each sent invoice → opens modal asking for payment method, reference number, date paid
- On confirm, creates a payment record and marks invoice as paid

**PDF download (nice to have, do after the basic UI works):**
- Use `@react-pdf/renderer` or `jsPDF` to generate a simple PDF invoice
- Include: ACE Altius Consulting header, invoice number, client details, line items table, total, payment instructions

**API routes:**
- `GET /api/admin/invoices` — fetch all with client/counselor names
- `POST /api/admin/invoices` — create invoice
- `PATCH /api/admin/invoices/[id]/status` — update status
- `POST /api/admin/invoices/[id]/payment` — record payment

---

## FEATURE 3 — P&L Summary (Admin only)

**Route:** `/admin/finance`

**What it is:** A monthly summary of income vs expenses. No complex accounting — just totals pulled from the invoices and expenses tables.

**UI to build:**

- Month selector (default current month)
- Summary cards at top:
  - Total Invoiced (sum of all invoices created this month)
  - Total Collected (sum of paid invoices this month)
  - Total Expenses (sum of expenses this month)
  - Net (Collected - Expenses)
- Income breakdown: list of paid invoices this month with client name and amount
- Expenses breakdown: grouped by category (salary, marketing, office, tools, other)
- Counselor commissions section: for each counselor, show deals closed this month, total deal value, commission amount (deal_value × commission_rate / 100)

**API route:**
- `GET /api/admin/finance/summary?month=2025-06` — returns all the above numbers

---

## DONE WHEN

- [ ] All 5 new tables created in Supabase
- [ ] Mock data loaded (deals, invoices, expenses, commission rules)
- [ ] `/admin/crm` shows kanban board with 3 test deals in correct columns
- [ ] Deal stage can be changed from the card
- [ ] `/admin/invoices` shows invoice list with correct status badges
- [ ] New invoice can be created with line items
- [ ] Mark as Paid records payment and updates invoice status
- [ ] `/admin/finance` shows monthly summary with correct totals
- [ ] Commission calculation shows for Hashaam and Aneeqa
- [ ] `npm run build` passes
- [ ] `vercel --prod` deployed successfully

---

## FINAL STEP — After all 4 overnight briefs complete

Run this verification checklist:
1. Log in as admin@acevisa.co — should land on /admin
2. Check /admin/knowledge-base — should show 10 entries
3. Check /admin/campaigns — should show existing campaigns
4. Check /admin/performance — should show Hashaam and Aneeqa with metrics
5. Check /admin/hr-flags — should load without errors
6. Check /admin/crm — should show 3 deals in kanban
7. Check /admin/invoices — should show 2 invoices
8. Check /admin/finance — should show monthly P&L with expenses
9. Log in as Hashaam — should see Zain and Fareeha in client list
10. Open Zain's profile — should load all 8 sections
11. Click View Brief on Zain's meeting — should load without 404
12. Open chat with any test client — AI should respond in 3 sentences, no em dashes
13. Type "lets book a meeting for tomorrow 2pm" in chat — AI should confirm booking

Commit all changes with message: "Overnight build — Phase 3 + Phase 4 foundation + fixes"
Push to main.
Run: `vercel --prod`
