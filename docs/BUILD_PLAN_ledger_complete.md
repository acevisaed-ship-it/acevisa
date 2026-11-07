# Master build plan: complete accounts + HR + visa-case system

Owner: Hashaam. Spec: the 19-section requirements checklist. Status date: 6 Nov 2026.
Ground rules: `CURSOR_INSTRUCTIONS_connect_supabase_vercel_github.md`. Production has no branch; every SQL file is shown to the owner, applied one at a time with `npx.cmd supabase db query --linked --file <file>`, never `db push`.

## 0. Assumptions (owner decisions stand where the spec conflicts)
| Spec says | Build follows (owner's earlier decision) |
|---|---|
| D4 / withdrawal after payout claws back | Never claw back for outcome. Only an actual refund claws back. Cleared-but-unpaid on a failed case -> `held` for manual review. |
| Sign-off 2: reassign reverses old incentive | Past milestones keep the holder at the time; new milestones go to the new holder. Reversal happens only on refund/expense recompute. |
| Roles Accounts/HR/Instructor | No new roles. Instructor = capability (`staff_capabilities`). Accounts/HR screens are admin/CEO-scoped. |
| Incentive = rate x gross x share | rate x (gross x milestone %) x share %. Milestones split gross, 25% each for study visa. |
| Share approval by both counselors + admin | Admin approves. Shares must sum to 100 before clearance. |
If the owner wants a spec line to win, change it before the matching phase starts.

## 1. What is already written (by Claude, not yet applied unless noted)
| File | Content | State |
|---|---|---|
| migrations 20261107000000/010000/020000 | audit, assignments, payments/expenses links, milestones, incentives, clearance, shares, refunds, vouchers, advances, owner ledger | **Applied live** |
| migrations 20261108000000 | receipt_no, voucher serial, incentive_holds, payout_adjustments, commission plans/tiers, `v_ledger` view | written |
| migrations 20261108010000 | lookups, stage engine, typed cases, visit visa, attestation, checklists, services | written |
| migrations 20261108020000 | instructors, language tests, sessions, instructor incentives, salary structures, payroll | written |
| migrations 20261108030000 | reference seed: categories, levels, 20 countries, study + visit stages, exam orgs, services | written |
| pending/mock_test_data_seed.sql | v1 mock data | **Applied live** |
| pending/mock_test_data_v2.sql (+ cleanup) | stages, visit visa, vouchers, refunds, language tests, attestation, checklists, services, shares, salaries | written |
| pending/seed_milestone_shares_equal.sql | 25% x 4 | written |
| src/lib/ledger/{incentives,payroll,tiers}.ts | pure maths, compiled and checked | written |

## 2. Phases (each: migration -> routes -> screen -> mock data -> tests; report to owner after each)
Claude writes schema, seeds, pure logic and test SQL. Cursor writes routes/screens (needs a working typecheck/build and live DB) and applies SQL.

### Phase A: close the gaps in what exists (spec 3, 4, 5, 7, 18)
- Apply migrations 20261108000000, 20261108030000 and the 25% seed.
- Expense categories in UI allowlist/filter: embassy, voucher, appointment, insurance, itinerary, govt, other.
- Payment form: kinds consultancy/voucher/service/other; show `receipt_no`.
- Incentives: create `pending_clearance` rows when a milestone is recorded (so counselors see "pending", never "earned"); clear flips to `active` and stamps `payable_period`; **revoke clearance** reverses active -> pending; block clearance if approved shares for the deal do not sum to 100; hold/release routes (`incentive_holds`, reason + task ref); admin notification when a cleared case is withdrawn/rejected before pay date (-> `held`).
- Share request/approve screens (admin approves).
- Accounts "Ledger" tab backed by `v_ledger` (date, counselor, branch, product, student filters; negative rows for refunds/expenses).
- Commission plans screen (percent or tier); `rates.ts` reads `commission_plans` first (use `tiers.ts` for tier plans), then existing sources.
Tests: scenarios 1, 2, 5, 6, 10 below.

### Phase B: refunds and vouchers (spec 6, 7)
- Routes + registers: voucher sale = payment (`payment_kind='voucher'`) + `vouchers` row + auto expense (`reduce_gross=true`); apply voucher to a case -> `used`; expiry cron (30 and 7 day alerts, `needs_decision` at expiry, nothing automatic).
- Refund flow requested -> approved -> paid; voucher refunds only if `issued` and vendor refund confirmed; partial refunds; on paid: recompute incentives (reverse + new row) and, if the original was already paid, insert a `payout_adjustments` clawback.
Tests: scenarios 3, 4.

### Phase C: stage engine, study dimensions, visit visa (spec 12, 13, 14)
- Apply migration 20261108010000. Screens: stage board per case (audited changes via `stage_suggestions`-style approval or direct for admin), study fields on case, withdrawal with reason + stage, visit visa board with auto-expense rows for the three charges, pipeline funnel report.
Tests: scenarios 7, 8.

### Phase D: checklist KB, attestation, services (spec 15, 16)
- Admin KB screens (versioned; case pins `checklist_template_id`; show cases per version), attestation items per case, ad-hoc service charge -> payment (`payment_kind='service'`) with normal gross/clearance rules.
Tests: scenarios 9, 10.

### Phase E: payroll (spec 11)
- Apply migration 20261108020000. Payroll run builder per branch/period using `computePayroll()` (`src/lib/ledger/payroll.ts`): basic + allowances - deductions + active incentives - adjustments + carry-in; held shown, excluded; shortfall carries forward. Incentives with `payable_period = run period` and status `active`; mark `paid` on run paid and link `payroll_item_id`. Lines saved to `payroll_item_lines`; printable/exportable payslip.
Tests: scenario 12.

### Phase F: language tests and instructors (spec 9, 10)
- Language test register, sessions schedule view, instructor plans and `instructor_incentives` (same snapshot/reversal pattern), instructor report.

### Phase G: query API, extraction, dashboards (spec 8, 17)
- `GET /api/admin/clients/directory?fields=phone&city=Karachi` and `POST /api/admin/query` with server-side column allow-list per view (never salary/password columns), CSV/XLSX export, every call written to `audit_events`. Wide views `v_cases_wide`, `v_clients_wide`. Dashboards listed in spec section 17 with the standard filters (from, to, branch, counselor, visa_category, country, program_level, university, status, stage, city), counselor scorecard, case P&L.
Tests: scenario 11.

### Phase H: RLS lockdown, then go-live checks
- Lockdown on a Supabase branch first (browser anon use removed), re-run anon read test, then production. Then clean up mock data (v2 cleanup, then v1 cleanup).

## 3. Mock data and test protocol
Run order: reference seed -> shares seed -> `mock_test_data_v2.sql`. Mock clients are the 36 `TEST ...` clients (6 per counselor); client 1 gets an IELTS/voucher case, 2 docs stage, 3 partial, 4 full visa case (clear it), 5 visit visa, 6 overdue IELTS + service charge.
| # | Scenario | Expected with mock data |
|---|---|---|
| 1 | assign, pay, ledger, clear, payroll | Client 4: gross 170,000; 4 milestones x 42,500 x rate; after Clear -> `active`, `payable_period` = clearance month; appears in payroll |
| 2 | reassign | Move client 3 to another counselor; old payments keep old counselor; next milestone goes to new holder; no reversal |
| 3 | voucher lifecycle | Client 1 voucher `issued` -> apply to case -> `used`; MOCK vouchers 5/25 days from expiry show alerts |
| 4 | refund | Request vendor-confirmed refund on an unused voucher; negative `v_ledger` row; gross and incentive recompute; clawback if already paid |
| 5 | shared case | v2 seed leaves a 60/40 share *requested*: approve -> clear -> each counselor earns rate x gross share x own %; sum must be 100 |
| 6 | month cutoff | Clear a case at 00:30 PKT on the 1st (or set the clock in a test) -> `payable_period` = next month; library test already covers this |
| 7 | study case through 12 stages | Stage counts on the dashboard; withdrawn case shows reason + stage |
| 8 | visit case | 9 fields complete; dashboard shows totals; auto-expenses 8,000 + 6,000 |
| 9 | KB edit | Publish template v902; v901 cases unchanged; version case counts correct |
| 10 | ad-hoc service | Service charge -> payment -> counted in gross, clearance rules apply |
| 11 | query API | `fields=phone&city=Karachi` returns only phones for Karachi, one audit row with fields/filters/row count |
| 12 | payroll breakdown | Basic 80,000 + allowances 13,000 - tax 4,000 + incentives - clawback - advance, held shown not netted, carry rules |
Cursor writes a script `scripts/ledger-scenarios.mjs` (service role, against a branch or the mock rows only) that runs each scenario and prints pass/fail with the numbers above. All scenario data is `MOCK_SEED`-tagged and removable.

## 4. Definition of done per phase
Migration shown to owner and applied; RLS on new tables; every write audited; `npx.cmd tsc --noEmit` and `npm run build` pass; scenario(s) pass on mock data; owner shown the screen; only intended files staged; PR not pushed to main.

## 5. Message to send Cursor now
> Read `docs/BUILD_PLAN_ledger_complete.md`. Start Phase A. Apply, one at a time and showing me results: `20261108000000_ledger_gaps_holds_ledger_plans.sql`, `20261108030000_reference_seed.sql`, then `supabase/pending/seed_milestone_shares_equal.sql`. Then build the Phase A code. Run typecheck, lint and build first (the sandbox I wrote the files in cannot compile the project, so expect errors in my files `src/app/api/admin/commissions/route.ts` and `src/components/admin/CommissionsPanel.tsx`; fix them). Report after Phase A with the scenario results for 1, 2, 5, 6, 10, and wait for my approval before Phase B.
