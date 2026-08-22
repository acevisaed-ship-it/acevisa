# AI Counselor Strategy — Decision Log & Backup

This is a persistent backup of the AI counselor redesign discussion, kept for the
reason this doc exists in the first place: an earlier conversation about a system
called **A.R.I.A** (continuous self-learning AI counselor) was lost to a session
reset before it could be written down. This file exists so that doesn't happen
again — update it whenever a real decision is made in an AI-counselor strategy
conversation, even if the corresponding CURSOR_INSTRUCTIONS build doc already
covers the implementation detail. This is the "what we decided and why," not the
"how to build it" — that lives in the phase docs referenced below.

Related build docs: `CURSOR_INSTRUCTIONS_ai_counselor_phase1_prompt_rewrite.md`
(ready to build), `CURSOR_INSTRUCTIONS_ai_counselor_roadmap_phase2plus.md`
(scoped, not yet build-ready).

---

## Core philosophy decided

The AI counselor exists to help a student pursue **exactly what they asked for**,
not whatever converts best or whatever the AI judges as objectively better. No
redirecting a student off their own stated country/service choice, no closing
techniques, no urgency framing, no "adjacent product" upsell logic — all of
which existed in the original prompt and are being removed.

The **only** exception is a hard infeasibility checklist: education level below
a country's minimum, below the minimum age for that visa category (exact age
NOT yet confirmed — see open items), a disqualifying prior refusal/legal
history, or a hard financial floor that can't be met. General difficulty,
approval-odds guessing, or "harder than average" do not qualify as reasons to
redirect a student.

## Tone philosophy

Warm, encouraging, possibility-focused — don't volunteer discouragement or lead
with obstacles. But this is explicitly bounded, not unlimited: fee amounts (once
permitted to state them), refund/non-refundable terms, whether a country
requires payment before a visa outcome is guaranteed, and genuine hard
infeasibility must never be softened or hidden, regardless of how positive the
surrounding tone is. This boundary exists because omitting these specific facts
is what turns into real financial harm to a client, not just an uncomfortable
conversation.

## Style rules decided

- 5-8 words per message where possible, sent as multiple short messages with a
  pause between them (mirrors how real human staff actually text — confirmed
  from reviewing real WhatsApp exports) rather than one long block.
- Pakistani Roman Urdu / English mixing only — explicitly never Hindi or
  Sanskrit-derived vocabulary, even if superficially similar.
- Script mirroring: if a client writes in Urdu using Arabic/Nastaliq script
  (not Roman Urdu), reply in that script — some clients can't read Roman Urdu
  comfortably.
- Voice notes are a first-class input, not an edge case — real data showed a
  large share of actual leads communicate almost entirely via voice.
- Never use bullet points, headers, or a list of multiple questions in one
  message. One question per message.

## Data collection philosophy

Moving from one-by-one chat questions toward a structured in-chat form the AI
triggers once a student looks like a genuine candidate for a category (not on
message 1). Anything left blank gets followed up on conversationally afterward,
one field at a time — never re-listing the whole set. Budget is never a form
field or a chat question — it's always redirected to a meeting/office visit.

The exact intake fields already used by real staff today (confirmed from real
chat exports, not invented): Name, City, Interested Country, Last Education,
Percentage/Marks Received, Completion Year, Interested Course. Visit-visa and
work-visa field sets still pending from the business owner.

## Category playbooks decided

**Study visa** — collect eligibility basics first (education, completion year,
marks, country, English test status). If an English test is missing, don't
immediately pitch IELTS/PTE classes — stay engaged, let it come up naturally.
Never state a fee/budget in chat. Never state a visa success percentage, ever.

**Visit visa** — collect basic info first, then may state fixed figures once
asked directly (no itemized breakdown): 5,000 PKR pre-assessment (credited
toward the total), 500 EUR/USD/CAD/GBP filing fee by destination
(non-refundable, upfront), and an overall package total — **this total is
UNRESOLVED, see open items below, do not ship a number**. "Done base" requests
(client wants to pay only if the visa is approved) are always declined —
ACE doesn't offer contingent/outcome-based payment, the filing fee is always
upfront and non-refundable, but no further charges apply if refused.

**Work visa** — state only which countries/options are currently available, no
process detail, no fees. Everything else happens in the office or with a
senior counselor.

**IELTS/PTE** — the one category where pricing is meant to be shared directly.
Current offer: 25,000 PKR standard, 14,000 PKR discount this month → 11,000 PKR
promo price (this matches a real quoted price found in the chat exports, so
it's considered confirmed). Class times: 12-1, 3-4, 4-5, five days/week
(also independently confirmed in a real chat export). Alternative tests
(TOEFL iBT, Duolingo, LanguageCert, Oxford ELLT) are not detailed in chat —
refer to a meeting/office visit.

## Identity decided

The AI refers to itself as "counselor." When handing off to a human, it refers
to that person as "your senior counselor," never as an escalation or "I'll
forward this." Office visit is always asked for first; a phone call is only
offered as a fallback if the client says a visit genuinely isn't possible —
never presented as an equal first option.

## Real data reviewed this session (grounding for all of the above)

Two files were uploaded and reviewed in full:

1. `visa-route-schema.json` — a detailed JSON Schema for a much richer
   per-route knowledge base structure (eligibility, documents, financial,
   fees, process timeline, delay factors, rejection reasons, post-decision,
   `query_scripts` for example-phrasing → answer-approach → must-not-say, and
   escalation rules) than the current flat `knowledge_base` table or the
   static `aceKnowledge.ts` file. This is the intended target structure for
   Phase 3 (see roadmap doc).

2. `deepseek_json_20260811_9083b0.json` — 55 real WhatsApp lead conversations
   handled by actual human staff, reviewed in full. Key findings:
   - Response time is a serious, visible problem — many leads waited hours or
     overnight for a first reply, and a large share went cold before ever
     specifying what they wanted, most plausibly due to delay rather than lack
     of interest. This is the strongest concrete case for the AI actually
     going live.
   - Staff currently share exact per-country prices and even a specific "99%"
     visa success rate freely in chat — both directly contradict the new AI
     rules. Confirmed with the business owner this is intentional: the AI is
     meant to be *more* disciplined than current human practice, not matching
     it. A real human counselor's judgment isn't being second-guessed by this
     — the new chat rules apply to the AI specifically.
   - "Done base" (contingent/pay-only-if-approved) is a real, recurring client
     request across multiple leads — staff consistently decline it. This is
     now precisely understood and encoded in the visit-visa playbook.
   - The existing manual intake template staff already copy-paste today is
     word-for-word close to the structured form being planned for Phase 2 —
     confirms the form is a natural upgrade of an existing working process,
     not a new concept being imposed.
   - Voice notes are extremely common across leads — confirms the "sometimes
     uneducated people communicate through voice chat only" concern is a
     dominant real pattern, not a hypothetical edge case.
   - Staff twice told a 19-year-old work-visa applicant "not possible" — a
     real minimum-age rule exists somewhere, exact threshold and whether it's
     country-specific is unconfirmed (see open items).

## Cost/architecture decision: daily batch, not real-time

The planned self-learning loop (Phase 4, the practical version of what
"A.R.I.A" was describing) runs once daily rather than continuously, for two
concrete reasons: the master prompt/knowledge base blocks are sent as
Anthropic cached blocks (`cache_control: ephemeral`) in `chat/route.ts` today —
continuous small updates would invalidate that cache constantly and make every
conversation pay full-price processing instead of cheap cache reads. A daily
batch keeps the cache stable all day and only refreshes once. The daily
analysis pass itself should use Anthropic's async batch processing, since
overnight analysis isn't latency-sensitive and that's priced for exactly this
kind of job. Nothing self-applies — CEO reviews and approves proposed
knowledge base additions once a day before they go live.

## Access decision (carried over from the earlier Knowledge Base discussion)

The entire knowledge base / route-schema management area is CEO-only, not
branch-admin-accessible — same pattern as CEO's private email settings
(`requireCeoApi()`). This was an explicit, deliberate decision, not a default.

## Open items — need business owner input before Phase 2/3/4 can be fully spec'd

1. **Visit-visa overall package fee** — business owner said 150,000 PKR; real
   staff chat exports consistently showed 700,000-750,000 PKR for the same
   package. Unresolved. Phase 1 does not let the AI state any total until this
   is confirmed.
2. **Work-visa minimum age rule** — staff told a 19-year-old "not possible"
   twice in real data. Exact threshold and whether it varies by country is
   unconfirmed. Phase 1's infeasibility checklist explicitly avoids letting
   the AI state a specific age cutoff until this is confirmed.
3. **Visit-visa and work-visa intake form fields** — business owner said
   they'll provide these; study-visa fields are already confirmed from real
   usage.
4. **Office hours** — real chat exports showed a small inconsistency (one
   staff message said "10-6," another said "9-6"). Worth confirming the
   actual hours.
5. **Route-based knowledge base seed content** — the schema has ~15 major
   sections per route; populating it accurately needs real business data, not
   something to infer from chat exports alone. Recommended to start with the
   highest-volume routes visible in the data (UK/Germany/Cyprus study,
   Schengen visit) and expand from there.

---

## Academic grounding found: this is "ARIA" (test-time learning via HITL)

What the business owner was describing under the name "A.R.I.A" (from the lost
earlier conversation) turns out to match a real published concept: an LLM agent
framework for **test-time learning through human-in-the-loop guidance**. Not a
specific product to integrate — a pattern to build toward. Saved here, **not
started**, per explicit instruction ("save it for now we'll work on it later").

**The three mechanisms, and how they map onto this project:**

1. **Self-dialogue** — the agent assesses its own uncertainty before answering;
   if not confident, it flags rather than guesses. Maps to the already-decided
   rule: if something isn't in the knowledge base, escalate rather than
   improvise an answer.
2. **Expert correction** — a human supplies the right answer. Maps to the
   counselor answering an escalation.
3. **Timestamped, conflict-resolving knowledge base** — the answer is stored
   with a timestamp so old vs. new information can be resolved automatically.
   **This is the one piece not yet designed.** The current `knowledge_base`
   table has `added_at` but nothing that lets newer verified info supersede
   older info, or flags something as no longer current.

**Known limitation of this pattern (relevant to this business specifically):**
quality is bottlenecked by how responsive and accurate the human experts are.
If counselors are slow to answer escalations, the AI stays wrong/ignorant
longer. Counselor response speed on escalations is therefore a real quality
lever for the whole system, not just a support-team metric.

**The one concrete schema gap this suggests for Phase 3** (route-based
knowledge base) — proposed, not yet applied to any spec:

```sql
-- Additions to consider for the knowledge_base table (Phase 3), not yet built:
superseded_by uuid references knowledge_base(id)  -- if this entry is outdated
confidence_level text default 'verified'  -- verified | provisional | outdated
source_type text  -- counselor_escalation | manual_entry | official_source
valid_from date    -- when this information became accurate
valid_until date   -- null means still current
```

This would let the AI prefer newer verified entries over older ones and treat
counselor-escalation-sourced answers as provisional until reviewed, vs. a
manually-entered CEO-approved fact treated as verified immediately. Ties
directly into the already-planned Phase 4 daily-batch review loop — that
review is essentially the "expert correction" + "conflict resolution" step of
ARIA, running once a day instead of live, for the caching/cost reasons already
decided.

**Status: parked.** Nothing implemented. Revisit when Phase 3 (route-based KB)
is actually being spec'd — this schema addition belongs in that spec, not as
a standalone change to the current flat `knowledge_base` table.

---

## WhatsApp control architecture — decided direction, not yet built

Separate from the AI counselor rebuild, but same underlying goal (full
visibility, no data leakage to third parties) plus a distinct business
problem: staff currently deal with other agencies on the side and can poach
clients via personal WhatsApp, the same way the portal already prevents this
for email (staff get portal-only access to `noreply@aceyourvisa.com`, no raw
Bluehost inbox access, cannot delete inbox/sent).

**Options walked through, in order, with why each was set aside:**
1. Official WhatsApp Business Cloud API — fully compliant, auto-logged, but
   text-only (no voice/video calls possible via any WhatsApp API, ever — this
   is a hard platform limitation, not a policy one) and requires
   consolidating to one shared business number.
2. Browser extension reading a real personal WhatsApp Web session
   (read-only/surveillance-only, human still sends everything manually) —
   lower ban-risk than automation since nothing is sent programmatically, but
   still not officially sanctioned, and still cannot see call content (calls
   never render in the page DOM) — only call metadata (duration, missed/
   answered) is visible this way. Voice notes ARE fully readable this way
   since they're actual files, not streams — can be transcribed (Whisper or
   similar; Claude does not do audio transcription) with decent but imperfect
   accuracy on Roman-Urdu/English code-switched informal speech.
3. Server-hosted Android emulator or persistent headless browser per
   counselor, portal streams it like remote desktop — solves "no browser or
   laptop needed, WhatsApp is just there whenever the portal opens" (session
   state lives server-side, not on any personal device), and closes the
   client-poaching risk since no session data ever sits on a personal device.
   Downside: centralizing many linked WhatsApp sessions on datacenter/server
   IP infrastructure is actually a stronger ban-detection signal to WhatsApp
   than normal individual device use, not a weaker one.

**Decided direction (this session): physical phone farm.** Real Android
phones, one per counselor number, real SIM cards, kept powered and connected
at the office — company-owned hardware, never in a counselor's hand or home.
This solves the ban-risk problem properly (a real phone on a real SIM looks
exactly like normal usage to WhatsApp, unlike server/datacenter infrastructure)
and is the only option discussed that gives full, real, working voice AND
video calling, since it's the literal WhatsApp mobile app running on real
hardware, not an approximation.

**How it fits together:**
- Portal streams each phone's screen and relays taps/typing back to it —
  screen-mirror-and-remote-control tooling for Android already exists
  (scrcpy is the standard open-source tool for this; browser-based wrappers
  around it already exist rather than building the streaming layer from raw
  scratch).
- Logging/surveillance runs via Android's Accessibility Service (same OS
  feature screen readers and password managers use) reading rendered message
  content and forwarding it to the portal — same read-only category as the
  browser-extension idea, just OS-level instead of browser-level, and lower
  risk since the account/device pairing looks completely normal.
- Calls work natively since it's a real phone; the remaining engineering is
  relaying the counselor's mic/camera to and from the phone through the
  browser stream. Call recording specifically still needs a look at consent
  requirements, independent of whether the tech works.
- Voice-note transcription (Whisper or similar) plugs in the same way already
  decided above, feeding the same daily learning-loop data pipeline.

**Known costs/trade-offs, named plainly:** real hardware capital cost per
counselor seat, ongoing SIM/data cost per device, physical maintenance burden
(reboots, battery wear, OS updates breaking things) — this needs someone
owning basic hardware upkeep, it doesn't fully become "just software." This is
meaningfully bigger in scope than a portal feature — closer to standing up a
small physical infrastructure layer.

**Status: build vs. buy resolved — building in-house.** Researched current
commercial phone-farm/device-management vendors (Scalefusion, PF Phone Farm,
Total Control, VMOS Cloud) — all real and mature, but built for one person
bulk-controlling many devices for testing/automation, not for many counselors
each needing reliable access to their own single phone through a business
portal, and none have anything WhatsApp-specific. Buying one wouldn't remove
the custom integration and logging work, just add a paid layer underneath it
that wasn't designed for this. Decided to build on top of `scrcpy`
(Genymobile — free, open-source, actively maintained, the real industry
standard for Android screen mirroring/control) and `web-scrcpy` (an existing
open-source browser wrapper around it) rather than from raw scratch.

**Key architectural constraint surfaced during scoping:** the portal itself
runs on Vercel (serverless) and cannot host a persistent scrcpy/ADB
connection to physical phones — that needs a real always-on machine,
physically able to reach the phones (USB or same-network ADB-over-TCP),
most naturally a small dedicated PC at the office. The Vercel-hosted portal
will need to talk to that separate service over the internet, which needs
its own security story (not exposing raw device-control ports publicly) —
this is now a second piece of infrastructure alongside the main portal, not
something that fits inside the existing Next.js/Vercel deployment.

**Next step:** `CURSOR_INSTRUCTIONS_whatsapp_phone_farm_phase1_poc.md` —
single-phone proof of concept, written up separately, needs to be run by
Hashaam with real hardware (one Android phone) before any portal integration
work starts.
