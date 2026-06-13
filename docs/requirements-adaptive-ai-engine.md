# ARIA — Adaptive Revenue Intelligence Architecture

> **Status:** Planned — do not build yet. Revisit after portal is stable and has sufficient client data (suggest: 50+ converted clients).

## Goal

Build a self-improving AI counseling engine that learns from every client interaction, counselor technique, knowledge base update, and application outcome — and uses that learning to continuously optimise for conversion rate, client satisfaction, trust-building, and onboarding.

## What ARIA Is Not

- It does not retrain Claude's weights (not possible at runtime)
- It is not a separate model
- It cannot manufacture conversions if counselor follow-through is weak

## What ARIA Actually Does

Builds an ever-richer *context layer* that the AI operates with — so over time it behaves like a counselor who has seen hundreds of similar cases, knows which objections come up for which client types, and knows exactly what moves a client from interest to commitment.

---

## Four Layers

### Layer 1 — Data Collection
Already largely in place. Missing pieces to add later:
- Counselor outcome notes (qualitative, post-meeting)
- Explicit conversion event (when agreement is signed or stage 4 reached)
- Embassy/institution application result (approved / rejected / pending)
- Client satisfaction signal (simple post-meeting rating)

### Layer 2 — Pattern Synthesis Engine
Scheduled jobs (nightly or weekly) using Claude Haiku:
- Cross-client pattern extraction: which conversation paths → stage progression
- Objection mapping: what concerns repeat, what responses resolved them
- Profile segmentation: which client types (city, language, budget, concern) convert vs drop off
- Counselor technique extraction: what high-performing counselors do differently

Output stored in `ai_learning_insights` table (structured JSON, versioned).

### Layer 3 — Dynamic Context Injection
At chat session start, AI is briefed with:
- This client's own profile + behavioral history
- Synthesised insights for similar clients (same language, city, concern type)
- Current "top objections" and proven responses for their profile segment
- What typically moves clients at this pipeline stage forward
- Counselor notes on this client

This is RAG (Retrieval-Augmented Generation) applied to ACE Altius's own business data.

### Layer 4 — Outcome Feedback Loop
- On every stage transition → extract what conversation content preceded it
- On every conversion → full path analysis, stored as "success pattern"
- On every drop-off → flag for review, identify where engagement fell
- On every escalation resolution → counselor answer enters knowledge base automatically

Over time: the system builds an `objection_library`, `conversion_patterns`, and `counselor_techniques` — all feeding back into Layer 3.

---

## New Tables Required (build later)

```sql
ai_learning_insights     -- synthesised cross-client patterns, versioned
conversion_patterns      -- full conversation paths that led to conversions
objection_library        -- objections + proven responses, auto-built from escalations
counselor_techniques     -- patterns from high-performing counselors
client_satisfaction      -- simple post-meeting ratings (1–5 + optional comment)
application_outcomes     -- embassy/institution results per client
```

---

## Build Order (when ready)

1. Define "conversion" precisely for ACE Altius (agreement signed? stage 4+? both?)
2. Add conversion event tracking + satisfaction signal
3. Build `ai_learning_insights` schema + weekly synthesis job
4. Enrich chat system prompt with Layer 3 context injection
5. Add outcome feedback loop triggers
6. Build admin dashboard showing what ARIA has "learned" (transparency layer)
7. Counselor technique indexing

---

## Success Metrics (define baselines before building)

- Conversion rate: % of registered clients who reach stage 4+
- Average messages before conversion
- Drop-off stage distribution
- Client satisfaction score (post-meeting)
- Counselor-to-close ratio per counselor

---

## Prerequisite

Portal must be stable and have at least 50 converted clients before pattern synthesis produces meaningful signal. Build this at Month 3–4 of live operation.
