# Finance Module — Requirements

> Status: **Saved for later implementation**
> Requested: 2026-06-13

---

## 1. Invoice / Expense Clarity

### Current problem
- `invoices` table = money coming IN from clients (client invoices)
- `expenses` table = money going OUT (company costs)
- The `InvoiceManager` UI only creates client invoices — there is **no admin UI to enter expenses**
- There is no visual type indicator on any invoice row — you cannot tell at a glance if a record is income or expense
- The `FinanceSummary` P&L reads both tables and shows them separately, but the entry points are disconnected

### Required changes

**A. Split entry UI into two clear modes:**
- "New Client Invoice" — money coming IN from a client for a service
- "New Expense" — money going OUT (salary, rent, tools, marketing, etc.)
- Each should have a distinct color-coded badge in all tables: GREEN = incoming, ORANGE = outgoing

**B. Expense entry UI (currently missing entirely):**
- Add a full expense form: category, description, amount, date paid, payment method, reference number
- Categories (from existing `ExpenseCategory` type): salary, rent, utilities, marketing, software, travel, other
- Expenses must be visible and editable in the same Finance/Invoices section

**C. Invoice list improvements:**
- Add a "Type" column: "Client Invoice" vs "Expense"
- OR split into two tabs: "Client Invoices" | "Expenses"
- Show clear IN / OUT labels with color coding on each row

**D. Data route clarity (summary):**
```
Income route:  New Client Invoice → invoices table → P&L "Income" section
Expense route: New Expense → expenses table → P&L "Expenses" section
```
Both flows must be accessible from the same Finance admin page.

---

## 2. Excel / Sheets Export for All Financial Reports

All financial report views must have a "Download Excel" button. Reports to cover:

| Report | Columns to export |
|---|---|
| P&L Summary | Month, Total Invoiced, Total Collected, Total Expenses, Net |
| Client Invoices | Invoice #, Client, Counselor, Amount, Status, Due Date, Paid Date |
| Expenses | Date, Category, Description, Amount, Payment Method, Reference |
| Counselor Commissions | Counselor, Deals Closed, Deal Value, Rate %, Commission Amount |
| HRM / Payroll | Counselor, Base Salary, Commission, Total Payout (per month) |

**Implementation notes:**
- Use the existing `xlsx` skill / `xlsx` npm package
- Add an `/api/admin/finance/export?month=YYYY-MM&type=pl|invoices|expenses|commissions` endpoint
- The frontend calls this and triggers a file download
- Date range filter: allow export for a custom date range, not just one month

---

## 3. AI Behavioral Analysis — Saved for Later

### What it should do
For every client who has chat history, the AI should:
1. **Generate and continuously update** a psychological read, behavioral notes, and observations based on the full chat history
2. **Track changes over time** — each analysis run is stored as a versioned snapshot, so history is never overwritten
3. **Delta analysis** — note what has changed since the last session (new info shared, attitude shifts, urgency changes)
4. **Store everything for AI training** — each run stores the input messages + output analysis as structured JSONL training data

### New DB table needed: `ai_behavioral_notes`

```sql
CREATE TABLE ai_behavioral_notes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  analyzed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count           INTEGER NOT NULL,       -- total messages when this ran
  messages_since_last     INTEGER NOT NULL DEFAULT 0, -- new messages analyzed
  psychological_read      JSONB,                  -- personality, tone, style
  behavioral_observations TEXT[],                 -- specific observations list
  delta_from_last         TEXT,                   -- what changed vs previous analysis
  risk_flags              TEXT[],                 -- red flags / concerns
  training_data           JSONB,                  -- {input: messages[], output: analysis} for fine-tuning
  profile_snapshot        JSONB,                  -- full ai_profile copy at this moment
  model                   TEXT NOT NULL DEFAULT 'claude-3-5-haiku-20241022'
);

CREATE INDEX idx_behavioral_notes_client ON ai_behavioral_notes(client_id, analyzed_at DESC);
```

### Trigger mechanism
- Auto-trigger after every 5th new message in a chat session (background, non-blocking)
- Also trigger when counselor opens the client brief (lazy evaluation if stale)
- Manual "Re-analyse" button on the brief page

### What gets stored per run
```json
{
  "psychological_read": {
    "personality_type": "anxious, detail-oriented",
    "communication_style": "formal, asks many clarifying questions",
    "emotional_state": "hopeful but uncertain",
    "trust_level": "building"
  },
  "behavioral_observations": [
    "Mentioned budget concern twice in one session",
    "Shifted from UK to Canada preference in message 12",
    "Showed urgency — wants to apply before October"
  ],
  "delta_from_last": "Client now mentions spouse joining; previously solo applicant. Budget increased from 30L to 45L PKR.",
  "risk_flags": ["Unclear employment status", "No IELTS score yet"],
  "training_data": {
    "input": [ /* array of message objects */ ],
    "output": { /* the full analysis above */ }
  }
}
```

### Display in counselor brief
- New "Behavioral History" section in `BriefShell` / `PsychologicalReadSection`
- Shows timeline of analyses with timestamps
- Latest analysis at top, expandable history below
- Delta badge showing "3 changes since last session"
