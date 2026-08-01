# Requirements: Receptionist direct referral, client ID lookup, counselor intake questionnaire

For Cursor. Three related pieces of work, plus a content deliverable (the questionnaire
itself, which should end up both as a printed/verbal counselor script and as digitized
form fields).

---

## 1. Receptionist: assign directly to a counselor at intake

**Current behavior:** `POST /api/receptionist/register-client` always creates the client
with `counselor_id = null`. It sits on the Unassigned Clients page until an Admin/Branch
Manager assigns it.

**Wanted:** receptionist can optionally pick a specific counselor at registration time,
so the client is assigned immediately — no admin step required.

**Changes needed:**
- New endpoint `GET /api/receptionist/branch-counselors` — guarded by
  `requireReceptionistApi()`, returns active counselors where
  `role = 'counselor' AND branch_id = receptionist.branch_id`. Keep it minimal (id, name
  only) — receptionist shouldn't see counselor emails/phones/client counts.
- `ReceptionistRegisterForm.tsx`: add a "Refer to counselor" dropdown, populated from
  that endpoint, with an explicit "Leave unassigned (Admin will assign)" option as
  default — don't force a choice, some receptionists won't know who's free.
- `POST /api/receptionist/register-client`: accept an optional `counselorId` in the
  body. If present (and validated as an active counselor in the receptionist's own
  branch — don't trust the client blindly), set `counselor_id` on insert instead of
  leaving it null, and send the "New client assigned to you" notification directly to
  that counselor instead of the "unassigned registration" notification to admins.
- Activity log description should note whether it was a direct referral or left
  unassigned, e.g. `"Receptionist X registered client Y and referred them to counselor Z"`.

---

## 2. Client ID lookup by role

| Role | Scope | Notes |
|---|---|---|
| CEO / Branch Manager (Admin) | Already works — All Clients page search, scoped by branch for Branch Manager, global for CEO | No change needed |
| Counselor | **Not built.** Add a search box to their own client list (`dashboard/clients`) that filters by name/phone/`client_code` — scoped to clients already assigned to them. Decide separately whether counselors should ever see clients *not* assigned to them (covering a colleague) — default recommendation: no, keep it to their own list for now, revisit if it becomes a real workflow pain point. | |
| Receptionist | **Not built.** Add a narrow, read-only lookup: enter a `client_code`, get back name + assigned counselor's name only — nothing else (no case notes, no pipeline stage, no financials). Purpose: verify a returning client's ID at the front desk, or find out who to route a walk-in to. New endpoint `GET /api/receptionist/lookup?code=AV-000123`, guarded by `requireReceptionistApi()`, scoped to the receptionist's own branch. | |

---

## 3. Manual counselor intake — recommendation

Receptionist-registered clients bypass the AI chat entirely, so they never get a
`qualification_score`, psychological notes, or recommended pathway — the fields the
Counselor Briefing Card (`docs/PROJECT_CONTEXT`, Section "Counselor Briefing Card") is
built from. Recommend adding a **Manual Intake form**, counselor-facing, on the client
detail page, that:

- Uses the question set in §4 below as its fields
- On submit, writes a `profile_json` into `ai_profiles` for that client (same shape the
  AI chat already produces — `goal_country`, `study_field`, `qualification_score`,
  `psychological_notes[]`, `suggested_talking_points[]`, etc.) so the *same* briefing
  card component renders correctly regardless of intake path
- `qualification_score` here is counselor-assigned (1-10, same rubric as the AI uses)
  rather than AI-computed — the counselor is the one who just had the conversation
- Store the raw answers too (a new `manual_intake_responses` jsonb column on
  `ai_profiles`, or a separate table) — don't only store the AI-shaped summary, keep the
  actual answers for audit/reference

This is a genuinely useful feature, not just plumbing — worth prioritizing whenever
receptionist-sourced volume starts to matter.

---

## 4. Counselor intake questionnaire

**How to use this:** not a script to read verbatim — a natural conversation, in this
rough order, building rapport before the sensitive sections (finances, visa refusals).
Skip questions the AI chat already answered if the client came through that path first;
use it in full for receptionist-referred / walk-in clients.

### A. Personal & family profile
- Full legal name (exactly as on passport/CNIC), date of birth, CNIC/B-form number
- Phone, WhatsApp, email, current city/address
- Marital status (relevant for dependent/spouse visa pathways)
- Family composition — parents' occupation, siblings, who is the key decision-maker on
  this decision within the family
- Passport status — valid passport? Number, expiry, any prior international travel

### B. Academic background
- Highest qualification completed and the full chronology below it (Matric/O-Level →
  Intermediate/A-Level → Bachelor's → Master's, as applicable) — schools/colleges/
  universities attended, city, years. Full chronology matters: visa officers and
  universities both flag unexplained gaps.
- Grades for each level — percentage or CGPA, plus major/field of study
- Any gap years (not studying) — and the reason, ready to explain
- Any backlogs, failed subjects, or repeated years
- English proficiency — IELTS/PTE/TOEFL/Duolingo taken? Score, or not yet attempted
- Other standardized tests if relevant (SAT/GRE/GMAT)

### C. Work / professional history
- Currently working — job title, employer, industry, years of experience
- Full employment history, chronological, with dates and reason for leaving each —
  same gap-explanation logic as academics
- Relevance of experience to intended field of study
- Any employment gaps and the reason (matters especially for work-experience-linked
  visa/immigration pathways)

### D. Financial profile
Sensitive — ask with context, not cold. This is one of the most scrutinized parts of
any study-visa application.
- Who is sponsoring — self, parents, another relative, scholarship, education loan?
- Sponsor's occupation, income (monthly/annual), source (salaried, business, property,
  remittances from abroad)
- Approximate liquid savings available for tuition + living costs
- How long has that balance been maintained? (most visa regimes want funds "seasoned"
  over months, not deposited right before applying — flag this early if it's an issue)
- Property or other assets — useful for loan eligibility and as evidence of ties to
  home country for visa types that assess "intent to return"
- Has the family sent money abroad before (for this or another purpose)? Shows
  established capacity/track record
- Realistic annual budget they're comfortable with — keeps university/country
  recommendations grounded in what's actually affordable, not aspirational

### E. Destination & program preferences
- Preferred country/countries, ranked if more than one, and why each
- Preferred field of study and degree level (Bachelor's/Master's/Diploma/PhD)
- Target intake (Fall/Spring/Winter, year)
- Any target universities already researched, or fully open to recommendation
- On-campus vs off-campus, city size preference

### F. Purpose & ultimate goals
- Why this specific degree/field — the actual career motivation, not just "better
  opportunities"
- What does success look like in 5-10 years — settle abroad, return to Pakistan and use
  the qualification here, build an international career, family reunification, etc.
- Family members already living in the target country
- Post-study plan — work there (PGWP-type pathway), immigrate, or return home
- Biggest hesitation or "what would make you not go" — cross-check against the AI
  chat's `main_concern` field if one exists

### G. Compliance / red-flag questions (necessary, ask directly but respectfully)
- Any prior visa refusals — which country, stated reason if known
- Any prior visa application submitted independently or through another consultant
- Any criminal record or history relevant to a visa decision
- Any medical condition relevant to visa medical exams
- Confirm they understand documents will be verified

### H. Document readiness (quick checklist, not a deep discussion)
CNIC/B-form, passport, academic transcripts/certificates, English test scorecard, bank
statements, experience letters, photographs — mark what's on hand vs. still needed.
