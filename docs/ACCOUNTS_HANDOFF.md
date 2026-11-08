# Accounts section: status and pickup notes

Last updated: 2026-11-08. Status: built, tested locally, deployed to main. Work paused by the CEO.

## What is built (Releases 1-4, all on main)
- **R1 data foundation:** institutions (`universities` + short_code, is_partner), agents, agent_institutions, case fields (agent_id, source_type, applied_at, institution_other, partner_at_application); views `v_cases_report`, `v_payments_wide`, `v_services_wide`, `v_stage_history`, `v_profit_by_service`.
- **R2 filter screen:** Registers & Reports with dropdown filters (AND across filters, OR within one), counts beside options, date range with "date applies to", totals over the whole filtered set, saved views, "Edit details" on cases, Institutions & Agents setup tab (head office only).
- **R3 roles:** Accountant role (`/accountant`; no payroll/incentive registers; cannot clear cases, change rates or approve payroll; cannot edit/delete old expenses). Counselor "Accounts" tab (`/dashboard/accounts`): own clients only, create/send invoices, record incoming payments, no profit or expenses.
- **R4:** cross-tab (group by X across Y) and Excel export, alongside CSV.

## Still to do (in this order)
1. **Real commission rates** per counselor in the CEO rate settings. The 10% default is a placeholder, so incentive and profit-after-incentive figures are provisional.
2. **Mark partner institutions and add real agents** (Institutions & Agents tab).
3. **Clear mock data** before real reporting. Scripts are in `supabase/pending`: `mock_institutions_agents_cleanup.sql`, `mock_test_data_cleanup.sql`, `mock_test_data_v2_cleanup.sql`. Ask Claude to wrap them in one guarded script that previews and asks YES.
4. **Create the first real Accountant** account (CEO, Counselor Accounts panel, role Accountant, optionally branch-limited) and check the screens with them.
5. **Add the 19 institution names** cut off with "..." in the Germany/Italy decks (listed as comments in `supabase/pending/institutions_from_country_decks.sql`).
6. **Row-level database security (RLS) lockdown.** The app checks permissions on the server, but direct database access is not locked down yet. Main hardening item.

## Design decisions already made (do not re-ask)
- Profit is counted on cash received; expected profit is shown separately.
- Counselor incentive is a cost: profit shown before and after incentives.
- Void with a reason, never delete.
- Keep the original currency and a PKR value.
- Accountants may see case-level incentive amounts (needed for profit after incentives).
- The 2023 Excel workbook was for learning only and is never imported.
- Admissions and eligibility data lives separately (not in the DB yet); Accounts only links to institutions.

## How to work on it
- Free-tier workflow: use a feature branch, run `scripts/accounts-reports-setup.ps1` (steps 5-6 are the type check and build), test with `npm run dev`, then merge to `main` (Vercel deploys main). No paid Supabase/Vercel branches.
- Supabase commands run from PowerShell through `npx.cmd supabase db query --linked`. The scripts ask YES before production writes. The `--linked` and middleware-to-proxy warnings are harmless.
- Key files: `src/app/api/admin/query/route.ts`, `src/components/admin/LedgerWorkbench.tsx`, `src/lib/admin/requireAccountsApi.ts`, `src/lib/ledger/queryViews.ts`, `src/lib/ledger/rates.ts`.
