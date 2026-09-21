# Portal Valuation & Licensing Strategy — Decision Log

Persistent backup of a valuation and commercialization-strategy discussion about
the ACE Visa Portal itself (the codebase in this repo, not a client-facing
feature). Kept for the same reason `AI_COUNSELOR_STRATEGY_LOG.md` exists: so this
reasoning survives a session reset. Update this file whenever a real decision is
made in a follow-up conversation about selling, licensing, or valuing the portal
— this is the "what we concluded and why," not implementation detail.

All figures below are estimates with stated methods and assumptions, not
appraisals. Nothing here is financial or legal advice.

---

## 1. Baseline valuation (portal as it stands today, for ACE Altius's own use)

**Verified technical facts** (from direct codebase inspection): Next.js 16 /
React 19 / TypeScript, Supabase (Postgres + Auth), Tailwind v4, Vercel. 484
`.ts`/`.tsx` files, ~60,000 LOC, 174 API routes, 66 SQL migrations. Four
role-based route groups (admin/counselor/public/student) plus a receptionist
route. Integrations: Anthropic + OpenAI (AI chat), Resend + AWS SES + IMAP
ingestion, Twilio SMS, web-push, jsPDF/xlsx export, GoDaddy API, Three.js,
Framer Motion, Zustand. ~3.5 months of git history (Jun 7–Sep 19, 2026), only
36 commits — thin/batchy history.

**Critical gaps found:** zero automated tests, no CI/CD, and Row-Level Security
present in only 3 of 66 migrations despite a service-role-key architecture and
handling client PII (passports, academic records). This RLS gap is the single
most important technical finding — it's a liability today regardless of any
commercialization plan, and a hard blocker to selling/licensing the software to
anyone else until closed.

**Business facts supplied by founder:** solo founder, still active (key-person
risk noted); business model today is internal use, sellable later; under
$5,000 invested in money terms; live, daily operational use inside ACE Altius;
no direct software revenue (indirect only, via the consultancy's own
operations).

**Valuation methods applied** (pre-revenue, so three methods shown per the
requested framework, not blended into one number):
- **Cost-to-Replicate:** estimate of what a comparable rebuild would cost in
  time/money — this is the only method that reflects the asset's value *today*
  given there is no external revenue or customer base yet.
- **Comparable-Transaction (Flippa/Acquire.com-style):** used as a sanity check
  against how similar pre-revenue internal tools trade, not as the primary
  method here.
- **Risk-Adjusted Market-Opportunity:** context for what this *could* become,
  explicitly not what it's worth today.

**Final verdict delivered:** realistic range **$10,000–$60,000 today** (asset/
cost-basis value, given zero external revenue, zero external customers, solo
key-person risk, and the open RLS gap), with a stated **$75,000 high case**
contingent specifically on landing one real, unaffiliated paying pilot
customer — which was flagged as moving the valuation more than any new feature
could.

**Named competitors / market category:** "Study Abroad Application Platform"
category sized at ~$5.29B (2026) → $8.95B (2033), 7.8% CAGR (Coherent Market
Insights). Direct competitors in the agent-facing CRM niche: ApplyBoard,
Agentcis, EduagentCRM (~$37/mo entry tier), StudyCRM, DreamApply, HEIapply,
Edvisor.io, Meritto (formerly NoPaperForms), SmartX CRM. Conclusion: the portal
is **not differentiated on the core CRM layer** against these — its
differentiation, if any, is the AI chat/counselor layer and the fact it's
already proven in live daily use.

---

## 2. Scenario: offering it as multi-tenant SaaS to other consultancies

Explored as a direct question: what if ACE Altius offers this software as a
service to other consultancies across Pakistan, India, and other study-abroad
markets.

**The gating issue, ranked above tech and market:** ACE Altius is itself an
operating consultancy. Selling to other consultancies means asking direct
competitors to hand over client-pipeline and commission data to a rival
business. This is a structural trust problem, not a messaging problem. Three
mitigations discussed: spin the software into a legally separate entity with
real (not cosmetic) separation; sell only into markets/segments where ACE
Altius doesn't compete; or accept a smaller, trust-based buyer pool (peers,
non-overlapping cities/niches).

**Technical requirement if pursued:** true multi-tenancy — `org_id` +
enforced RLS on every table (not just role-based checks), per-tenant billing,
per-tenant branding/config, tenant-safe admin tooling. Estimated **2–4 months**
of focused solo-founder work. The existing 3-of-66 RLS coverage is disqualifying
for this path specifically — a cross-tenant data leak in a multi-tenant CRM is
an existential story, not a bug.

**Market reality by geography:**
- **India** — large (~$80B by 2026, ~1.8M outbound students/year) but already
  dominated by Meritto (1,000+ organizations using it) plus Agentcis, SmartX,
  etc. Treated as a year-3+ conversation, not a near-term target.
- **Pakistan** — comparatively underserved; no identified Pakistan-first
  incumbent; large but fragmented market, many agencies still on
  spreadsheets/WhatsApp. Identified as the actual beachhead.
- **"Other countries"** — too vague to size credibly; Bangladesh/Nepal and the
  Gulf-based Pakistani-diaspora consultancy segment are the more plausible
  next steps than a broad "other countries" push.

**Regulatory:** India's DPDP Act 2023 uses a negative-list model for
cross-border transfer — allowed by default unless a specific country is
explicitly restricted (none were, as of the research date); consent under
Section 6 is the standard lawful basis; sectoral rules (e.g., RBI payment-data
localization) can still override. Net: not a near-term legal blocker for a
Pakistan-hosted SaaS serving Indian consultancies. Separately flagged: the AI
chat feature needs a hard scope restriction (informational only, never
advisory) or contractual liability-shifting before it's exposed to a
third-party tenant's end clients, given licensed-immigration-consultant regimes
in some jurisdictions.

**Revised financial model under this scenario** (18-month horizon, Pakistan-
anchored pricing ~$50–$150/month per consultancy):
- Bear case: 0–3 paying consultancies → **$0–$5,000 ARR**
- Base case: 10–25 consultancies → **$10,000–$24,000 ARR**
- Best case: 40–80 consultancies (Pakistan + limited Bangladesh/Nepal
  expansion) → **$40,000–$90,000 ARR**

Recommended sequence if pursued: resolve the trust-problem answer first →
close the RLS gap (needed regardless) → get one trusted Pakistani consultancy
to pilot free before building any billing/multi-tenancy infra → only build
multi-tenancy after that pilot confirms real demand → treat India as
out-of-scope until Pakistan has 15–20 real paying customers.

---

## 3. Pricing model decided on: per-client build/clone (white-label), not shared SaaS

Follow-up question sharpened the model: instead of one shared multi-tenant
platform, **build/deploy a separate isolated instance per client** (own
Supabase project, own subdomain) and charge a **setup fee + recurring
maintenance/management fee** — an agency/services model, not a subscription-
SaaS model. This was noted as actually easier than the multi-tenant path above:
each client's data is architecturally isolated (not commingled with a
competitor's), which softens (but does not eliminate) the trust problem from
Section 2, and sidesteps the RLS/tenant-isolation rebuild as a hard blocker for
this specific model.

**Setup fee** (cost to stand up one client's instance — new Supabase project +
migrations, branding swap, domain, their content/data, workflow tweaks,
training; not a from-scratch rebuild since the hard engineering already
exists):
- Light reskin (their branding, minimal data work, they supply content):
  **$500–$1,500**
- Standard deployment (branding + data migration + moderate customization +
  training): **$1,500–$4,000**
- Heavy customization (workflow changes, new integrations, building out their
  institution/country database): **$4,000–$10,000+**
- **Decision: price client #1 at or below the low end of "standard"
  regardless of actual effort**, to validate that an external, unaffiliated
  buyer will pay at all — that proof point was valued above margin on the
  first deal.

**Maintenance / management fee** (recurring; cost floor includes Supabase Pro
per instance, Vercel, plus usage-based AI/SMS/email costs that scale with the
client's own volume — flagged as the line item most likely to quietly erode
margin if flat-rated without a cap):
- Maintenance only (hosting, patches, uptime, backups, no active support):
  **$100–$250/month**
- Maintenance + management (above + AI/SMS/email usage up to a cap, priority
  bug fixes, minor tweaks, real support): **$250–$600/month**
- White-glove (dedicated support, regular feature work, SLA): **$600–
  $1,500/month**
- **Decision: structure as a base fee + metered overage on AI/SMS specifically**,
  not a single flat number, and **scale by counselor-seat or student-volume
  band** rather than one flat price regardless of client size — undifferentiated
  flat pricing was flagged as effectively subsidizing the largest clients.

**Standing caveat carried over from Section 2:** this model still requires
more hands-on trust than pure self-serve SaaS, since the vendor (ACE Altius,
an active competing consultancy) is the one deploying and touching each
client's instance during setup and maintenance. Worth surfacing explicitly in
the sales conversation, and part of the reasoning for pricing client #1 low —
buying the case study and trust track record, not just the fee.

---

## Open items / not yet decided

- Whether to actually pursue Section 2 (shared SaaS) or Section 3
  (per-client build/clone) as the real go-to-market — both were priced/scoped,
  neither was committed to.
- Legal entity separation question (spin out vs. keep inside ACE Altius) —
  flagged as the gating decision, not yet resolved.
- Pakistan's own data-protection regime — researched for India (DPDP Act) only;
  a Pakistan-specific equivalent check was identified as a gap, not yet done.
- Exact AI-chat liability/scope restriction language for third-party tenants —
  flagged as needed, not yet drafted.
