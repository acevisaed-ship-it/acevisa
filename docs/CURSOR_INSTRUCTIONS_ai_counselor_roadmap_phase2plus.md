# AI Counselor Rebuild — Roadmap: Phases 2-4

Phase 1 (`CURSOR_INSTRUCTIONS_ai_counselor_phase1_prompt_rewrite.md`) covers the prompt rewrite and multi-message delivery — build that first. This doc scopes what comes next. Phases 2 and 3 are **not yet implementation-ready** — each has specific open items that need confirmation from the business owner before a precise spec can be written. Phase 4 depends on Phase 3 existing. Do not start Cursor implementation work on Phases 2-4 from this doc alone — it's a roadmap, not a build spec. A follow-up doc with full detail will be written once the open items below are resolved.

## Phase 2 — Structured intake form (in-chat)

**What it is:** Today the AI collects student info by asking one question at a time in chat. The plan is a proper fillable form the AI can trigger mid-conversation — the student fills it in one screen instead of a back-and-forth, and anything left blank gets a natural one-at-a-time follow-up in chat afterward. This is a real engineering feature: needs a new in-chat form UI component (today the student chat is plain text messages only), a way for the AI to trigger it and know when, and a way for submitted structured data to update the client's profile.

**What's already confirmed and can inform the build:**
- Study visa fields (already used verbatim by staff today, confirmed from real chat exports): Name, City, Interested Country, Last Education, Percentage/Marks Received, Completion Year, Interested Course.
- Trigger timing: once it's clear the student is a genuine candidate for that category — not on the first message, per the existing conversation-stage rules.
- Budget should never be a form field — it's handled by redirecting to a meeting, per the Phase 1 playbooks, not collected as data.

**Open items — need business input before this is spec-ready:**
- Exact form fields for visit visa and work visa (business owner said they'll provide these).
- Whether age is a form field or something asked separately (relevant to the infeasibility checklist in Phase 1).

## Phase 3 — Route-based knowledge base (schema-driven)

**What it is:** Replace the current flat `knowledge_base` table (category/topic/answer) and the static `aceKnowledge.ts` file with a much richer structure — one record per visa route (category + country + specific visa type), covering eligibility, required documents, financial requirements, fee stages, process timeline, common delay causes, common rejection reasons, what happens after approval/refusal, and — notably — a `query_scripts` section (example client phrasing → how to answer → what must never be said) that lets specific objection-handling be encoded per route instead of buried in one giant prompt.

This also fixes a gap found earlier this session: the admin-editable Knowledge Base today only feeds the counselor's private Strategy tool, never the student-facing chat. This phase wires the new structure into both.

Per the standing access decision, this whole area is **CEO-only** to manage (not branch admin) — apply the same `requireCeoApi()` pattern used for CEO's private email settings.

**Structural basis:** the business owner provided a detailed JSON Schema (`visa-route-schema.json`) defining exactly this record shape — use it as the target structure for the new database table(s), don't redesign from scratch.

**Open items — need business input before this is spec-ready:**
- Real content to seed it with. The schema has ~15 major sections per route; populating this accurately for every country/category ACE offers is a significant data-entry effort, not something to guess at from the chat exports alone. Needs either the business owner's own data, or a scoped first pass (e.g., start with the 4-5 highest-volume routes visible in the chat exports: UK/Germany/Cyprus study, Schengen visit, and expand from there).
- The visit-visa overall package fee is still unresolved (business said 150,000 PKR; staff chats quoted 700,000–750,000). Phase 1 deliberately does not let the AI state any total — leave that to counselors until confirmed. Once resolved, put the correct figure into this structure's `fees` array.
- Confirm whether the counselor Strategy tool's existing `knowledge_base` table gets migrated into the new structure or kept running in parallel during transition.

## Phase 4 — Daily learning loop ("A.R.I.A")

**What it is:** A once-daily batch job (not real-time — deliberately, for both cost and prompt-caching reasons discussed with the business owner) that reviews the day's AI-student conversations, mines them for what worked (successful objection-handling, regional phrasing, stalled-conversation recoveries), and proposes structured additions to the Phase 3 knowledge base — specifically in the `query_scripts` format. Proposals are reviewed and approved by the CEO before anything goes live; nothing self-applies. Use Anthropic's async batch processing for the nightly analysis pass itself, since it's not latency-sensitive and is priced for exactly this kind of job.

This phase is meaningfully dependent on Phase 3 existing first — there's no structured place to propose additions *to* until the route-based knowledge base is built. Don't start this before Phase 3 ships.

**Open items:** design of the approval UI (likely an extension of the Phase 3 CEO-only knowledge base admin area — a "pending suggestions" queue), and how much historical data (like the 55-lead WhatsApp export reviewed this session) should be used as an initial seed/training pass versus only learning from live AI conversations going forward.

## Sequencing recommendation

Build Phase 1 first — it's fully specified and self-contained. Come back to Phases 2-4 once the open items above are resolved; each will get its own detailed CURSOR_INSTRUCTIONS doc at that point, same as everything else in this project.
