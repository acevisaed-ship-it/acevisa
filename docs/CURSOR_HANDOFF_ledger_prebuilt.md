# Cursor handoff: what is already written, what only you can do

Claude wrote files only. Nothing has been applied to Supabase, committed or deployed. Read `CURSOR_INSTRUCTIONS_accounts_hr_unified_ledger.md` and the ground rules in `CURSOR_INSTRUCTIONS_connect_supabase_vercel_github.md` first.

## Already written (review, then apply)

| File | What it is |
|---|---|
| `supabase/migrations/20261107000000_ledger_phase1_audit_assignments.sql` | `audit_events` (append-only trigger), `client_assignments` + backfill |
| `supabase/migrations/20261107010000_ledger_phase1_payments_milestones_incentives.sql` | payments/expenses extra columns, `product_milestone_shares`, `milestones`, `case_clearance`, `case_counselor_shares`, `incentives` |
| `supabase/migrations/20261107020000_ledger_phase2_refunds_vouchers_advances.sql` | `vendor_purchases`, `vouchers`, `refunds`, `staff_advances`, `owner_ledger_entries` |
| `supabase/pending/rls_lockdown_template.sql` | RLS lockdown. Do NOT apply until step A below is done |
| `src/lib/ledger/audit.ts` | `writeAudit()` helper |
| `src/lib/ledger/incentives.ts` | pure incentive maths. Verified against the owner's worked example: gross 170,000 -> A 8,500, B 6,800; after a 40,000 refund -> 6,500 / 5,200, clawback 3,600; 31 Oct 20:30 UTC (PKT 1 Nov) correctly rolls to the November payroll |

All new tables: RLS on, anon/authenticated revoked, money `numeric(12,2)`.

## Do in this order

A. **RLS prerequisite.** Move counselor login off the browser anon client to a server route; replace every browser `createClient()` data read/write with an API route; then apply `supabase/pending/rls_lockdown_template.sql` on a Supabase branch, test every role, then production. Re-run the anon read test (clients must return 0 rows / permission denied).
B. **Verify (read-only), report back:** the five checks in section 3 of the ledger plan. Also confirm: `clients.created_at` exists (backfill uses it); `applications` and `products` exist as referenced; `payments.invoice_id` is the only link today.
C. **Apply migrations** one at a time with `npx.cmd supabase db query --linked --file <file>` on a branch. Never `db push` / `migration repair`. Run the verification queries below.
D. **Code wiring (not written yet):**
 1. Assign route: close the open `client_assignments` row, insert the new one, keep `clients.counselor_id` current, write audit.
 2. Record-payment route (installments): insert a payment with counselor/product/deal/branch snapshots; derive invoice paid state from sum of recorded payments; keep the old mark-paid route working.
 3. Milestone route: insert `milestones` with holder from the open assignment at `occurred_at`.
 4. Clearance route (admin only): insert `case_clearance`, then use `src/lib/ledger/incentives.ts` to create `incentives` rows (reverse old + insert new on recompute; never update in place).
 5. Call `writeAudit()` from every finance and HR write route.
E. **Seed `product_milestone_shares`** (see decision below) and confirm with the owner.
F. Build the remaining phases (payroll, stage engine, checklist KB, visit visa, services, query API) as per sections 4 and 8.7, reporting after each phase.

## Conflict to resolve with the owner before step E

`product_payment_stages` for study visa products has stage 4 "Got Visa" as a **fixed PKR amount per counselor**, and stages 1-3 as percentages. The owner decided milestones **split the gross by percentage** (example: 25% each). Either replace the existing rules with `product_milestone_shares` (recommended; keep the old table read-only) or keep the fixed Got-Visa amount. Ask; do not guess.

## Verification queries

```sql
-- every client with a holder has one open assignment
SELECT count(*) FROM clients c WHERE c.counselor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM client_assignments a WHERE a.client_id=c.id AND a.ended_at IS NULL);  -- expect 0
-- audit append-only
UPDATE audit_events SET reason='x' WHERE false;  -- harmless; then try on a test row inside a transaction and expect an error
-- RLS on all new tables
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN
 ('audit_events','client_assignments','milestones','incentives','case_clearance','case_counselor_shares',
  'product_milestone_shares','vendor_purchases','vouchers','refunds','staff_advances','owner_ledger_entries');
-- milestone shares sum to 100 per product
SELECT product_id, sum(share_pct) FROM product_milestone_shares GROUP BY 1 HAVING sum(share_pct) <> 100;
```

## Gaps noted

- Voucher auto-expense creation, expiry cron, payroll tables, stage engine, checklist KB, attestation, visit visa table, services and the query API are specified but not yet written.
- Deals use `deal_value numeric(10,2)`; leave as is, new tables use `numeric(12,2)`.
- `payments.counselor_id` is a snapshot, so the assign route must never rewrite it.
