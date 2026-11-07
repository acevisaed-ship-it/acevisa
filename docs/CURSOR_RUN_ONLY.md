# Cursor: run-only checklist (no code writing)

All code, SQL and tests are already written in the repo. Your job is only to run these commands, paste results back, and fix a typo only if a command fails. Do not redesign anything. One step at a time; stop and report on the first failure.

Ground rules: `docs/CURSOR_INSTRUCTIONS_connect_supabase_vercel_github.md` (no `db push`, no `migration repair`, no `git add -A`, no secrets in chat). Production has no branch, so each SQL step is applied directly and is additive.

## A. Apply SQL, in this order (show each result)
```
npx.cmd supabase db query --linked --file supabase/migrations/20261108000000_ledger_gaps_holds_ledger_plans.sql
npx.cmd supabase db query --linked --file supabase/migrations/20261108010000_stage_engine_visa_cases.sql
npx.cmd supabase db query --linked --file supabase/migrations/20261108020000_language_instructors_payroll.sql
npx.cmd supabase db query --linked --file supabase/migrations/20261108030000_reference_seed.sql
npx.cmd supabase db query --linked --file supabase/pending/seed_milestone_shares_equal.sql
npx.cmd supabase db query --linked --file supabase/migrations/20261108040000_ledger_engine.sql
```
If a statement errors, copy the exact error back to the owner. Do not hand-edit SQL beyond an obvious typo, and say what you changed.

## B. Load mock data v2 and run the self-test
```
npx.cmd supabase db query --linked --file supabase/pending/mock_test_data_v2.sql
npx.cmd supabase db query --linked --file supabase/pending/ledger_scenarios_test.sql
```
The test ends with an intentional error that rolls everything back; the error text is the report. Paste every PASS/FAIL line.

## C. Check the app code compiles (the sandbox cannot do this)
```
npx.cmd tsc --noEmit
npm run lint
npm run build
```
Fix only compile or lint errors in these files if any appear: `src/app/api/admin/query/route.ts`, `src/app/api/admin/ledger/action/route.ts`, `src/app/api/admin/clearance/route.ts`, `src/app/api/admin/commissions/route.ts`, `src/components/admin/LedgerWorkbench.tsx`, `src/components/admin/CommissionsPanel.tsx`, `src/components/admin/AccountsSection.tsx`, `src/lib/ledger/*`.

## D. Small UI fix (the only edit expected)
Add `embassy, voucher, appointment, insurance, itinerary, govt` to the expense category allowlist and labels in the existing expense screen.

## E. Deploy and smoke test
Commit only the intended paths, open a PR (not `main`), use the Preview deployment, log in as CEO and open Accounts: `Commissions`, `Registers & Reports`. Report what shows for the mock clients.

## F. Do NOT do yet
RLS lockdown (`supabase/pending/rls_lockdown_template.sql`) and mock cleanup (`mock_test_data_v2_cleanup.sql`, then `mock_test_data_cleanup.sql`). Wait for the owner.
