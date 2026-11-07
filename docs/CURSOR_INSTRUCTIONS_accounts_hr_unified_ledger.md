# Cursor Instructions: Unified Accounts + HR Ledger (single shared database)

Owner: Hashaam (CEO). Read `docs/CURSOR_INSTRUCTIONS_connect_supabase_vercel_github.md` first; its ground rules apply here (no secrets in chat, no `migration repair`, no `git add -A`, show SQL before running, branch not `main`).

## 0. Goal

One shared Postgres (the existing Supabase project) where every money and HR event is a stored, individually auditable record tied to a client, a counselor (staff), a branch and a product. Each person or role then sees their own window onto the same data through scoped API views. Nothing is duplicated per user.

## 1. Prerequisite (do not skip)

Close the RLS exposure first (see the remediation order already given: revoke `anon` grants, patch counselor login to a server route, enable RLS with no policies on all public tables, tighten `USING (true)` policies on chat/notification tables). New tables below must be created with RLS enabled and no anon/authenticated grants. Access is enforced in API routes (`requireAdminApi()`, `requireCeoApi()`, branch scope helpers).

## 2. Decisions already made by the owner

| Topic | Decision |
|---|---|
| Refund after incentive paid | Claw back on the next payroll. Recompute incentive on net kept (payments minus refunds). Original incentive row is never edited; add a reversing row plus a payroll adjustment line. |
| Voucher refunds | Unused vouchers only, and the student refund is approved only after the vendor has refunded ACE. |
| Reassignment | By milestone. Each milestone's commission goes to whoever holds the client when the milestone occurs. Past payments keep their original counselor tag. |
| Instructors | A capability on existing staff (`counselors`), not a separate entity. External non-staff trainers are not supported. One profile, salary, attendance, payslip. |
| Voucher expiry | Alert at 30 and 7 days before expiry. At expiry the voucher goes to `needs_decision` (extend, reissue, write off). Nothing is released automatically. |
| Client field export | Admins only: CEO all branches, branch manager own branch. Counselors and receptionists cannot extract or export. Every extraction is logged. |
| Advances and personal spend | Track both. Staff advances deducted at payroll with a visible line. CEO personal/home spending lives in a separate CEO-only owner ledger, excluded from business profit. |

## 3. Verify before building (report findings, change nothing)

1. Read `supabase/schema.sql` and query the live schema (`information_schema.columns`) for `clients`, `counselors`, `deals`, `invoices`, `payments`, `expenses`, `commission_rules`, `commission_policy_rules`, `product_commission_rules`, `product_payment_stages`, `hrm_records`, `attendance_records`, `leave_applications`. Core `clients` and `counselors` are not in `supabase/migrations`.
2. Read all of `src/app/api/admin/clients/[clientId]/assign/route.ts`. Report whether reassignment touches `deals`/`invoices` counselor ids.
3. Find where offer letter / LOA / CAS / visa filing / visa granted milestones are currently recorded (check `applications`, `university_applications`, `stage_suggestions`, `activity_logs`, `clients.pipeline_stage`). Milestone-based incentives need a dated record of who held the client at that time.
4. Report whether `hrm_records` (from `schema.sql`) is still read or written anywhere in `src/`.
5. Report the three commission sources (`commission_rules`, `commission_policy_rules`, `product_commission_rules`) and which one `src/app/api/admin/finance/summary/route.ts` actually uses. We need one authoritative source.

## 4. Build phases (each phase: migration shown to owner, applied to a Supabase branch, tested on a Preview deploy)

All money columns are `numeric(12,2)`. No floats. Soft-delete or reverse; never hard-delete financial rows. All new tables: RLS on, service-role only.

### Phase 1: Audit trail, assignments, payments, incentives
- `audit_events` (append-only): id, actor_id, actor_role, branch_id, entity_type, entity_id, action, before jsonb, after jsonb, reason, created_at. Block UPDATE/DELETE with a trigger. Add a `writeAudit()` helper and call it from every finance and HR write route (payments, invoices, expenses, products, commission and incentive settings, leave, attendance edits, assignment changes, exports).
- `client_assignments` (history): client_id, counselor_id, assigned_by, assigned_at, ended_at, reason. Backfill one open row per client from `clients.counselor_id`. The assign route writes history and keeps `clients.counselor_id` as the current holder.
- `payments`: allow partial/installment payments. Add counselor_id (snapshot at payment time), product_id, deal_id, branch_id, status (`recorded|reversed`), receipt_url. An invoice's paid state is derived from the sum of its payments. Replace the "mark whole invoice paid" path with "record a payment" (amount, method, reference, proof); keep the old route working for existing data.
- `milestones`: client_id, application_id, product_id, type (`offer_letter|loa_cas|visa_filed|visa_granted|other`), occurred_at, holder_counselor_id (taken from `client_assignments` at that time), recorded_by.
- `incentives` (stored, not computed on read): id, counselor_id, product_id, payment_id or milestone_id, base_amount, rate_snapshot, amount, status (`active|held|paid|reversed`), reverses_id, payroll_item_id. Use `product_commission_rules` and its stage rules as the authoritative source (after step 3.5). Rate changes never rewrite old rows.

### Phase 2: Refunds, vouchers, vendor purchases, advances, owner ledger (all as approval requests)
Common request shape: status `requested -> approved -> paid` (or `rejected`), requested_by, approved_by, reason, proof_url, timestamps, each transition written to `audit_events`.
- `refunds`: payment_id, client_id, amount, method, reason, proof_url, vendor_refund_received (bool), request fields. Partial refunds allowed, many per payment. On `paid`: write a reversing incentive row and a clawback line queued for the next payroll.
- `vendor_purchases`: vendor, product, amount sent, amount deducted, balance, purchased_on, bought_from, proof_url. (Mirrors the VOUCHER PURCHASE sheet.)
- `vouchers`: client_id, payment_id, vendor_purchase_id, product_id, code (encrypted or access-restricted), face_value, status (`issued|used|expired|needs_decision|refunded`), valid_until, used_at, deal_id. A student may hold several unused vouchers. Voucher refund requires `status = issued` and the linked vendor refund confirmed.
- Expiry job (cron route, same pattern as `api/cron/finalize-daily-attendance`): notify at 30 and 7 days, flip to `needs_decision` at expiry.
- `staff_advances`: counselor_id, amount, purpose, given_on, approved_by, status, repaid_amount. Repayment deducted via payroll lines.
- `owner_ledger_entries`: entry_date, category, description, amount, method, paid_from, receipt_url. CEO-only (`requireCeoApi()`), excluded from every business P&L.

### Phase 3: Payroll
- `salary_structures` + `salary_structure_lines` (label, earning|deduction, fixed|percent_of_basic|percent_of_gross, effective_from).
- `incentive_holds`: incentive_id, reason, task_ref, hold_until, released_at, released_by.
- `payroll_runs` (branch, period, status `draft|approved|paid`), `payroll_items` (per staff: basic, allowances, deductions, incentives earned/held, carried_forward_in, adjustments, net, status `paid|carried_forward|partial`), `payroll_item_lines` (label, type `earning|deduction|incentive|adjustment|clawback|advance_repayment|carry_in|carry_out`, amount, source_ref, note).
- Net must be fully traceable line by line from basic to final figure. Held incentives show as lines but do not enter net. Unpaid balances roll into next run's carry_in.

### Phase 4: Language tests, instructors, sessions
- Instructor capability on existing staff (for example `staff_capabilities(counselor_id, capability)` with `instructor`). Do not create a separate instructors entity.
- `exam_organizations`, `language_tests` (client_id, deal_id, exam_org_id, test_type `LRW|Speaking|Both`, received_amount, payment_id, payment_proof_url, test_date, status, result), `test_sessions` (language_test_id, instructor_id = staff, session_type, scheduled_at, status), `instructor_commission_plans`, `instructor_incentives` (same snapshot/reversal pattern as `incentives`).
- Link `classes`/`class_enrollments` to products and payments so class fees appear in the ledger.

### Phase 5: Reporting and extraction
- Read-only views: `v_client_ledger` (everything for one client), `v_counselor_ledger` (everything for one staff member), `v_case_pnl`, `v_voucher_register`, `v_refund_register`, `v_payroll_breakdown`, `v_branch_summary`.
- `GET /api/admin/clients/directory?fields=phone&city=X` with a server-side field allow-list, admin-only (CEO all, branch manager own branch), CSV/XLSX export, every call written to `audit_events` (actor, fields, filters, row count).

## 5. Permissions
No new roles yet. CEO and admin (branch-scoped) only for finance and HR writes. Counselors see their own incentives and payslips through counselor-scoped routes. Do not add `accounts` or `hr` roles until the owner decides.

## 6. Data migration from spreadsheets (later, separate task)
The sources (Cash Cycle Tracker, Skills and Language Centre master, Altius intake sheets) contain free-text amounts, swapped day/month dates, inconsistent phone formats and sensitive columns (passwords, ID numbers). Import only after Phase 1 to 3 are live, through a reviewed staging step with owner sign-off. Never import the password or ID columns.

## 7. Definition of done for each phase
- [ ] Migration shown to owner and applied to a Supabase branch first
- [ ] RLS on, no anon/authenticated grants on new tables
- [ ] Every write goes through `audit_events`
- [ ] `npx.cmd tsc --noEmit` and `npm run build` pass
- [ ] Preview deployment tested for CEO, branch manager and counselor roles
- [ ] Only intended paths staged; PR opened, not pushed to `main`

---

# 8. Addendum v2: visa cases, stage engine, clearance, shared cases, universal query

Added after the owner supplied a second requirement set (S1 to S17). Where this addendum conflicts with sections 1 to 7, the conflicts are listed in 8.2 and marked OPEN. Do not guess; wait for the owner's answer.

## 8.1 Requirements added

| # | Requirement |
|---|---|
| S1 | Study visa cases tracked per client in the portal and in the shared DB |
| S2 | Office-wide category dashboard (aggregate counts only, no drill-down into counselor or client) |
| S3 | Study visa dimensions: country, program level (PG, UG, Diploma, Foundation, PhD, Other), university |
| S4 | Stage pipeline: docs submitted, admission processed, pre-admission interview, offer letter, pending requirements, visa application, embassy appointment, embassy interview, biometrics, visa received or rejected |
| S5 | Language test prep / certificate stage linked to `language_tests` |
| S6 | Withdrawal or rejection with reason and the stage it happened at |
| S7 | Document attestation tracking: label, count, stage |
| S8 | Country checklist knowledge base: shared, versioned, per country; a case pins the version used at creation |
| S9 | Visit visa pipeline: assessment report, documents received, payment, appointment / insurance / itinerary charges, checklist complete, flags and concerns, intended travel dates |
| S10 | Other visa categories (D7, other D-types, work) addable later through a lookup table, no schema churn |
| S11 | Ad-hoc services charged on a counselor's recommendation with no product (file prep, experience letter, document prep) |
| S12 | Case shared by two counselors, with an admin-approved share percentage |
| S13 | Incentive base: gross = received payments minus case expenses (voucher purchase, government, embassy, appointment, insurance, itinerary charges) |
| S14 | Incentive gated on admin 100% clearance of the client |
| S15 | Payments refundable at any stage; refund or new expense triggers incentive recompute |
| S16 | Month cutoff: anything cleared or paid after the last day of the month goes to the next month's closing |
| S17 | Universal filter search: any field, individual or collective, with grouping, aggregates and export |

## 8.2 What already exists in the portal (reuse, do not duplicate)

- There is no `cases` table. The case spine is `deals` (client, counselor, product, stage, value). Use `deals` as the case; add a `deal_id` to new tables. Do not create a parallel `cases` table.
- `applications` (institution_name, program_name, country, status, dates) and `application_updates` already track university applications per client. Extend these for study-visa dimensions (country id, program level, university id, intake, withdrawal fields) rather than creating a separate `study_visa_cases` table.
- `clients.pipeline_stage` is a coarse 1 to 7 integer (New Lead, Qualified, Registered Client, Documents in Progress, Application Submitted, Visa Outcome, Alumni). Keep it as the high-level funnel. The detailed stage engine below sits underneath it. `stage_suggestions` already implements a propose then approve pattern for stage changes; reuse that approval pattern.
- `clients.visit_visa_profile` is a jsonb column holding visit-visa data. Do not break it. Plan a structured visit-visa table and a one-way backfill from the jsonb, keeping the jsonb read-only until migrated.
- `product_payment_stages` and `product_commission_rules` already model milestone-based commission for study visa products (offer letter, LOA/CAS, visa filing, got visa).
- `expenses` exists with `counselor_id` and category but no `deal_id`/`client_id` link; add them (nullable) rather than a second expenses table.
- `applications.country` and `institution_name` are free text. Introduce `countries`, `program_levels`, `universities` lookup tables and link by id, keeping the text columns for old rows.

## 8.3 Conflicts with earlier decisions (OPEN: owner must answer, one at a time)

1. **Accrual month. ANSWERED by owner.** Payroll month M is paid on the 10th of month M+1, and incentives are paid together with that salary (July salary and July incentives are paid on 10 August). An incentive belongs to payroll month M when it is cleared on or before the last calendar day of M; anything cleared later belongs to month M+1 and is paid on the 10th of M+2. Store `payable_period` (the payroll month) and a derived `pay_date` (10th of the following month) on each incentive and payroll run. Closed payroll months must never change after the run is approved.
2. **Milestones versus gross. ANSWERED by owner: milestones split the gross.** Each product defines a percentage share of the case gross per milestone (offer letter, LOA/CAS, visa filing, visa granted; use `product_payment_stages` / `product_commission_rules`, percentages per product must sum to 100). Whoever held the client when a milestone occurred (from `client_assignments`) earns that milestone's share of gross, at that counselor's own rate. The clearance gate decides when the amount becomes payable. Store one incentive row per milestone per counselor.
3. **Shared cases. ANSWERED by owner.** Each counselor applies their own rate to the gross multiplied by their approved share percentage. Approved shares for a deal must sum to 100 before clearance.
4. **Voucher purchase. ANSWERED by owner: always a deducted expense.** The student's payment is a payment; the vendor purchase linked to the voucher is always an expense with `reduce_gross = true` on that deal. The incentive is therefore calculated on the margin ACE keeps. Creating a voucher must create the linked expense row automatically.
5. **Withdrawal or rejection after payout. ANSWERED by owner: never claw back for outcome.** A withdrawal or visa rejection does not change an incentive that was already paid. Only an actual refund (Q1 rule) triggers recompute and clawback. For incentives not yet paid, withdrawal or rejection stops further stage progress; **Cleared but not yet paid: ANSWERED by owner, held for manual review.** If a case is withdrawn or rejected after clearance and before its pay date, every `active` incentive on that deal moves to `held` with reason "case withdrawn/rejected" and appears on the payroll run as a held line (excluded from net). The CEO or branch manager releases or cancels it before the pay date; a cancel writes a reversing row. Notify the admin when this happens.
6. **Separate stage sets. ANSWERED by owner: separate stage set per visa category.** Each `visa_categories` row has its own ordered `stage_definitions`; new categories (D7, other D-types, work) add a new list with no code or schema change.
7. **Roles and instructors.** The v2 prompt that came with these requests lists `accounts`, `hr`, `instructor` user roles and an `instructors` table. These conflict with earlier decisions (no new roles yet; instructor is a capability on staff). Section 5 and Phase 4 stand; ignore those parts of the v2 prompt.
8. **S2 versus Q6. ANSWERED by owner: admins only.** The office-wide category dashboard follows the same scope as exports: CEO sees all branches, branch managers see their own branch. Counselors and receptionists do not see it.

## 8.4 Schema additions (all additive, RLS on, service-role only, audited via `audit_events`)

- Lookups: `visa_categories` (study, visit, d7, other_d, work, other), `countries`, `program_levels`, `universities` (country_id).
- Stage engine: `stage_definitions` (visa_category_id, code, label, order_no, active), `case_stages` (deal_id, stage_definition_id, status `pending|in_progress|done|blocked|waived`, started_at, done_at, done_by, notes). Current state is the latest row per `(deal_id, stage_definition_id)`; every change writes to `audit_events`.
  - Seed study stages: docs_submitted, admission_processed, pre_admission_interview, offer_letter, pending_requirements, visa_application, embassy_appointment, embassy_interview, biometrics, visa_received, visa_rejected, withdrawn.
  - Seed visit stages: assessment_report, docs_received, payment, appointment, insurance, itinerary, checklist_complete, flags_raised, travel_dates_set.
- Study fields (extend `applications`/deal): country_id, program_level_id, university_id, intake, status `active|withdrawn|rejected|granted|deferred`, withdraw_reason, withdraw_stage_id, decided_at, language_stage reference.
- Visit visa table: deal_id UNIQUE, country_id, intended_travel_from, intended_travel_to, assessment_report_given and assessment_at, documents_checklist_complete and documents_at, flags_json, client_concerns_shared and concerns_at, appointment_charges, insurance_charges, itinerary_charges. The three charge fields create `expenses` rows with `reduce_gross = true`.
- Attestation: `attestation_requirements` (country_id, doc_label, required_count, stage_label, version, active), `attestation_items` (deal_id, requirement_id, doc_label, required_count, attested_count, status `pending|partial|done`, done_at, proof_url).
- Checklist knowledge base: `checklist_templates` (visa_category_id, country_id, version, active), `checklist_template_items` (template_id, doc_label, required, notes), `case_checklist_items` (deal_id, template_item_id, doc_label, status `missing|received|verified|na`, received_at, verified_by). Templates are admin-editable and versioned; a case pins the template version used at creation; editing the KB never mutates past cases. Show how many cases use each version.
- Expenses: add `deal_id`, `client_id`, `payment_id` (nullable), `reduce_gross boolean default true`, `proof_url`; extend category to voucher, appointment, insurance, itinerary, govt, embassy, other.
- Shared cases: `case_counselor_shares` (deal_id, counselor_id, share_pct, requested_by, status `requested|approved|rejected`, approved_by, approved_at, effective_from, effective_to). Approved shares per deal must sum to 100 before clearance.
- Clearance: `case_clearance` (deal_id, status `pending|cleared|revoked`, cleared_by, cleared_at, notes). Admin only.
- Services: `services` (name, category `file_prep|experience_letter|doc_prep|application|other`, default_price, active), `service_charges` (deal_id, service_id, counselor_id, amount, description, approved_by, charged_at, payment_id). A service charge becomes a payment line so the same gross, clearance and incentive rules apply.
- `incentives` (from Phase 1) gains: gross_base, share_pct, payment_period, payable_period, clearance_id; status extended with `pending_clearance`. `gross_base` and `amount` are snapshotted at every recompute (reverse the old row, insert a new one; never recalculate in place).

## 8.5 Rules (apply once OPEN items in 8.3 are answered)

- gross = sum of payments for the deal minus sum of expenses for the deal where reduce_gross is true. Refunds already reduce payments.
- incentive = counselor's own rate (product, effective on payment date) x gross x share_pct.
- Lifecycle: payment inserted, recompute, status `pending_clearance`. Admin clears the case, status `active`, `payable_period` = month of clearance (next month if cleared after the last calendar day). Admin hold sets status `held` (shown on payroll as a line, excluded from net). Refund, new expense or reassignment reverses the old row and inserts a recomputed row. Payout sets `paid`.
- Clearance gate: no incentive is `active`, and counselors never see it as earned, until `case_clearance.status = cleared`. Revoking clearance reverses active incentives back to `pending_clearance`.
- Withdrawal or rejection: record status, stage and reason; the stage engine stops; the deal closes as lost. Incentive treatment depends on OPEN item 5.

## 8.6 Reporting and universal query (S2, S17)

- Wide read-only views: `v_cases_wide` (deal x client x counselor x branch x visa category x country x program level x university x current stages x payments x expenses x gross x incentives x clearance x shares x withdrawal reason) and `v_clients_wide`.
- `POST /api/admin/query` with body `{view, fields[], filters[{field, op, value}], group_by[], agg[], sort[], export}`. Columns come from a server-side allow-list per view; never pass raw SQL or user-supplied column names to Postgres. Admin only (CEO all branches, branch manager own branch). Every call is written to `audit_events` (actor, view, fields, filters, row count).
- Pre-built aggregate endpoints so the dashboard stays fast: office overview (counts by visa category, country, program level, university, stage, status), study visa, visit visa, attestation (document label x count x stage x country), pipeline funnel (count per stage and drop-off), counselor scorecard (existing metrics plus gross, pending clearance, held), payroll breakdown. All accept date range, branch, counselor, visa category, country, program level, university, status and stage filters.
- Knowledge base screens: countries, checklist items, attestation requirements and stage definitions. Admin only, versioned.

## 8.7 Updated build order (replaces the phase order in section 4 where they differ)

1. Prerequisite RLS fix.
2. Phase 1: audit trail, assignments history, installment payments, milestones, stored incentives.
3. Phase 2: refunds, vouchers, vendor purchases, advances, owner ledger, plus expenses linked to deals (reduce gross).
4. New Phase 3: clearance gate, shared case shares, gross and month-cutoff rules (load-bearing; needs all OPEN items answered first).
5. New Phase 4: stage engine and stage definitions seed.
6. New Phase 5: study visa dimensions on applications, withdrawal fields, language link.
7. New Phase 6: attestation and country checklist knowledge base.
8. New Phase 7: visit visa module (structured table plus backfill from `visit_visa_profile`).
9. New Phase 8: services and ad-hoc charges.
10. New Phase 9: wide views, query API, pivot endpoints, exports.
11. Payroll (old Phase 3), then instructors, tests and sessions (old Phase 4), then screens and permissions.

Cursor must report back after each phase and wait for owner approval before the next.

---

# 9. PostgREST join hint (required when a table has two FKs to `counselors`)

Soft-delete added `invoices.deleted_by` (and `expenses.deleted_by`) as a second foreign key to `counselors`, next to `counselor_id`. A bare embed such as `counselors(name)` then fails with an ambiguous relationship error, which broke invoice create/list/view.

**Rule:** whenever a table has more than one FK to `counselors`, every `.select()` embed must name the column or constraint:

```
counselors!counselor_id(name)
counselors!clients_counselor_id_fkey(name)
```

Reuse helpers in `src/lib/supabase/relations.ts` when they exist. Invoice endpoints already use `counselors!counselor_id(name)`.

The same hint will be required for new `deals`-based and `clients`-based joins in this plan as soon as those tables get a second link to `counselors`. `clients` already has several (`counselor_id`, `registered_by`, `removed_by`, `idle_snoozed_by`, `manually_qualified_by`). `deals` currently has only `counselor_id`; if Phase 1+ adds `assigned_by`, `cleared_by`, `deleted_by`, or similar, update every `counselors(...)` embed on that table in the same PR as the migration.
