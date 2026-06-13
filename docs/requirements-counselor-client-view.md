# Counselor Client View — Requirements

> Status: **Saved for later implementation**
> Requested: 2026-06-13

## Overview

The client detail section in the counselor dashboard should be expanded into a rich, structured view. Currently it shows basic info; the new design needs financial summaries, full chat history, and AI-generated insights.

---

## 1. Financial Summary (Counselor's Own Commission)

Each client card / profile should show the following fee/commission statuses, scoped to **the logged-in counselor's share only**:

| Label | Description |
|---|---|
| **Initial Consultancy Pending** | Initial consultation fee not yet paid to this counselor |
| **Final Consultancy Pending** | Final consultancy fee not yet collected / disbursed |
| **Visa Processing Fee Pending** | Visa processing fees owed but not yet settled |
| **Commission Due** | Confirmed commission earned but not yet paid to counselor |
| **Expected Commission** | Projected commission based on pipeline stage (not yet confirmed) |

### Additional charges
- **Any other charges left** — free-form field for miscellaneous outstanding amounts
- **Upselling amount (if any)** — upsell products/services billed to this client

---

## 2. Client Profile Information

Full structured profile for the client, including:
- Personal details (name, DOB, city, contact)
- Education background
- English test scores (IELTS / PTE / TOEFL etc.)
- Employment status
- Budget range
- Target country / visa type
- Pipeline stage + stage history

---

## 3. Complete Chat History

- Full chronological chat log between the client and the AI assistant
- Searchable / filterable by date
- Each message shows sender (AI or client), timestamp, message text

---

## 4. AI Psychological Profile & Notes

Generated from the AI chat session:
- **Psychological read** — personality type, communication style, emotional tone detected in chat
- **AI notes** — key observations, concerns, red flags flagged by the AI during conversation
- **Talking points** — suggested topics for the counselor to raise in the next meeting

---

## 5. Eligibility & Recommendations

AI-generated profile section:
- **Eligibility assessment** — visa category eligibility based on collected profile data
- **Recommended service pathway** — which visa / study route is most suitable
- **Qualification score** — numeric score (e.g. 1–10) with rationale

---

## Implementation Notes

- Data sources: `clients`, `conversations`, `ai_profiles`, `documents`, `meetings` tables
- Commission data will need a new `counselor_payments` or `commissions` table (TBD schema)
- The upsell / other charges fields may need a new `client_charges` table
- The existing `BriefShell` already covers items 3–5 partially; items 1–2 (financials) are net-new
- Consider adding a "Finance" tab to the existing client detail page rather than rebuilding from scratch
