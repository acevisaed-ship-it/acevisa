# Cursor Agent — Counselor QA Automation Command

> **How to use:** Open Cursor, press Cmd/Ctrl+I (Agent mode), paste this entire file's
> content into the prompt, and press Enter. Cursor will run the checks, fix what it
> can in code, and return a list of the items that **only a human can test**.

---

## YOUR TASK

You are auditing the ACE Altius Consulting portal (Next.js 16 App Router, Supabase, Tailwind v4).
The project root is the current workspace. Work through the steps below in order.

---

## STEP 1 — BUILD & TYPE CHECK

Run these commands and collect all errors. Do NOT stop on first failure — run all three.

```bash
npx tsc --noEmit 2>&1
npx eslint src --ext .ts,.tsx --max-warnings 0 2>&1
npx next build 2>&1
```

For every error found:
- TypeScript type error → fix in source file.
- ESLint violation → fix it.
- Missing import or wrong path → fix the import.
- `next build` error → fix the file.

Re-run until all three pass. Report what you fixed.

---

## STEP 2 — COUNSELOR PAGE FILE EXISTENCE

Verify each route file exists. Create a minimal placeholder if missing.

| Route | Expected file |
|---|---|
| `/dashboard` | `src/app/(counselor)/dashboard/page.tsx` |
| `/dashboard/clients/[clientId]` | `src/app/(counselor)/dashboard/clients/[clientId]/page.tsx` |
| `/dashboard/meetings` | `src/app/(counselor)/dashboard/meetings/page.tsx` |
| `/dashboard/tasks` | `src/app/(counselor)/dashboard/tasks/page.tsx` |
| `/dashboard/documents/[clientId]` | `src/app/(counselor)/dashboard/documents/[clientId]/page.tsx` or via redirect |
| `/student/chat` | `src/app/(student)/student/chat/page.tsx` |
| `/student/meetings` | `src/app/(student)/student/meetings/page.tsx` |
| `/student/documents` | `src/app/(student)/student/documents/page.tsx` |
| `/student/complaint` | `src/app/(student)/student/complaint/page.tsx` |
| `/portal` | `src/app/(student)/portal/page.tsx` |
| `/login` | `src/app/(public)/login/page.tsx` or `src/app/login/page.tsx` |

---

## STEP 3 — API ROUTE EXISTENCE & EXPORTS

| File | Required exports |
|---|---|
| `src/app/api/chat/route.ts` | `POST` |
| `src/app/api/chat/history/route.ts` | `GET` |
| `src/app/api/chat/upload/route.ts` | `POST` |
| `src/app/api/meetings/schedule/route.ts` | `POST` |
| `src/app/api/complaints/route.ts` | `POST` |
| `src/app/api/documents/upload/route.ts` | `POST` |
| `src/app/api/documents/[documentId]/download/route.ts` | `GET` |
| `src/app/api/documents/request/route.ts` | `POST` |
| `src/app/api/ai/behavioral-analysis/route.ts` | `GET`, `POST` |
| `src/app/api/notifications/route.ts` | `GET` (or similar) |
| `src/app/api/escalation/create/route.ts` | `POST` |
| `src/app/api/counselor/online/route.ts` | `POST` or `PATCH` |

---

## STEP 4 — CHAT SYSTEM CODE REVIEW

Read `src/components/chat/ChatShell.tsx`. Verify:
1. The root div uses `h-full` (NOT `h-dvh`) — fix to `h-full` if still `h-dvh`.
2. `ChatHeader` is wrapped in `<div className="hidden lg:block">` so it hides on mobile.
3. `ChatBubble` renders a timestamp (`message.timestamp`) below each bubble.

Read `src/app/(student)/student/chat/page.tsx`. Verify:
1. The outer wrapper uses `h-dvh` (not `min-h-screen`).
2. The main content area uses `overflow-hidden pt-14 lg:pt-0`.

Read `src/app/layout.tsx`. Verify:
1. The `<head>` includes a `<meta name="viewport">` tag with `interactive-widget=resizes-content`.
2. `apple-touch-icon` references `/apple-touch-icon.png` (not `/logo.png`).

Fix any of the above that are wrong.

---

## STEP 5 — STUDENT SIDEBAR NAVIGATION

Read `src/components/student/StudentSidebar.tsx`.
Extract all `href` values in `NAV_ITEMS`. For each one, verify the corresponding
`page.tsx` file exists under `src/app/(student)/student/`. Fix any missing pages.

---

## STEP 6 — BEHAVIORAL ANALYSIS SERVICE

Read `src/lib/behavioralAnalysis.ts`. Verify:
1. It imports from `@anthropic-ai/sdk` (already a dependency).
2. It references model `claude-haiku-4-5-20251001`.
3. The `runBehavioralAnalysis` function inserts into `ai_behavioral_notes` table.
4. It is imported and called in `src/app/api/chat/route.ts` after every 5th message.

Fix any import or reference errors.

---

## STEP 7 — PROFILE UPDATE DETECTION

Read `src/lib/profileUpdates.ts`. Verify:
1. `PROFILE_UPDATE_PATTERNS` has at least 10 regex patterns.
2. `detectProfileUpdates` returns a non-empty object when given a message like
   "I live in Lahore" (test mentally — no need to execute).
3. `PROFILE_FIELD_LABELS` contains keys for all fields used in patterns.

Report any missing labels or patterns.

---

## STEP 8 — DOCUMENT UPLOAD FLOW

Read `src/components/student/DocumentUploadItem.tsx`.
Verify:
1. It POSTs to `/api/documents/upload` with `multipart/form-data`.
2. It shows an uploading spinner while the request is in flight.
3. It shows a re-upload label for documents with status `uploaded` or `verified`.
   Wait — verified docs should NOT be re-uploadable. Confirm: `canUpload` is
   `status !== 'verified'`. Fix if wrong.

Read `src/app/api/documents/upload/route.ts`. Verify:
1. It validates MIME type (PDF, JPEG, PNG, DOCX, XLSX, ZIP or similar).
2. It validates file size (≤ 10 MB).
3. It updates the document row: `status='uploaded'`, `storage_path`, `file_size`,
   `mime_type`, `uploaded_at`.
Fix any of the above that are missing.

---

## STEP 9 — COPY PORTAL LINK COMPONENT

Read `src/components/CopyPortalLink.tsx`. Verify:
1. It constructs the URL as `${window.location.origin}/portal?clientId=${clientId}`.
2. It uses `navigator.clipboard.writeText()` to copy.
3. It shows "Copied!" text for ~2 seconds then reverts.
Fix any issues.

---

## STEP 10 — EMAIL NOTIFICATION ROUTES

Read `src/lib/email.ts`. Verify:
1. `sendEmail()` exists and wraps the Resend SDK.
2. It silently skips (does not throw) if `RESEND_API_KEY` is not set.
3. At least three email templates exist: complaint, escalation, meeting booked.

Read `src/app/api/complaints/route.ts`. Verify it calls `sendEmail` to admin(s) on POST.
Read `src/app/api/meetings/schedule/route.ts`. Verify it calls `sendEmail` to counselor on POST.

Fix any missing email calls.

---

## STEP 11 — PWA MANIFEST

Read `public/manifest.json`. Verify:
1. `icons` array references `icon-192.png` (192×192) and `icon-512.png` (512×512).
2. These files actually exist in `public/`. If they do NOT exist, note it as a
   manual action required (the user must run `node scripts/generate-icons.mjs`).

---

## STEP 12 — FINAL BUILD VERIFICATION

Run `npx next build` one final time. Zero errors required.

---

## STEP 13 — OUTPUT YOUR REPORT

When all steps above are complete, output a report in this exact format:

```
## CURSOR QA REPORT — COUNSELOR

### Automated checks passed ✅
- [list each check that passed]

### Issues found and fixed 🔧
- [describe each fix made, with file name]

### Issues found but NOT fixable by code alone ⚠️
- [describe any issues requiring manual steps — e.g. run npm install, run SQL migration, generate icons]

---

## MANUAL TESTING REQUIRED — COUNSELOR
The following items CANNOT be verified by code analysis.
A human must test these in a real browser.

### Authentication & Session
- [ ] Login with counselor email/password → lands on `/dashboard`, no error.
- [ ] Direct URL `/dashboard` while logged OUT → redirects to `/login`.
- [ ] Login WITHOUT "Remember me" → close browser → reopen → should be logged out.
- [ ] Login WITH "Remember me" → close browser → reopen → should still be logged in.

### Dashboard (/dashboard)
- [ ] Client list loads with name, phone, pipeline stage, last activity.
- [ ] Notification bell icon is white and visible on the dark header.
- [ ] Bell click → dropdown opens with recent notifications.
- [ ] Unread notifications show a red dot badge on the bell.
- [ ] Clicking a notification marks it read and navigates to the correct page.

### Client List
- [ ] Search bar filters clients by name or phone as you type.
- [ ] Clicking a client name opens their detail page.

### Client Detail Page
- [ ] Profile header: name, phone, city, qualification score with colour coding
  (green ≥70 / orange 40–69 / red <40).
- [ ] AI Profile Summary shows if the client has chatted.
- [ ] Pending Profile Updates banner: Approve applies the change, Reject dismisses.
- [ ] Documents checklist: status icons correct (clock / upload / tick).
- [ ] "View" button on uploaded/verified docs → file opens in new tab.
- [ ] Pipeline stage dropdown → change → refresh → persists.
- [ ] Notes field → save → refresh → persists.
- [ ] Copy portal link → "Copied!" → paste → opens client portal page.

### Pre-Meeting Brief
- [ ] Brief section loads with profile summary, service pathway, talking points,
  psychological read, and the new Behavioural Analysis timeline.
- [ ] "Re-analyse" button triggers a fresh behavioral analysis and updates the timeline.
- [ ] Behavioural Analysis timeline shows latest session expanded, older ones collapsible.
- [ ] Risk flags (if any) show in orange with warning icons.

### Meetings (/dashboard/meetings)
- [ ] Meetings list loads with date, time (PKT), client name, status.
- [ ] Can schedule a new meeting and it appears in the list.

### Tasks (/dashboard/tasks)
- [ ] Tasks load with client name, title, due date, status.
- [ ] Mark complete → task moves to completed state.
- [ ] Overdue tasks are visually highlighted.

### Email Notifications (requires RESEND_API_KEY)
- [ ] Client books meeting via AI chat → counselor receives email within ~1 min.
- [ ] AI creates escalation for your client → you receive escalation email.

### PWA — Install to Home Screen
- [ ] Open portal in Chrome on Android (or Safari on iPhone).
- [ ] "Add to Home Screen" / "Install app" prompt appears.
- [ ] After install, app opens full screen without browser chrome.
- [ ] App icon matches ACE Altius branding.
- [ ] If icons are missing: run `node scripts/generate-icons.mjs` first.

### Mobile Layout (Chat)
- [ ] Open `/student/chat?clientId=...` on a mobile screen.
- [ ] StudentSidebar hamburger (☰) is visible at top left — no double header.
- [ ] Chat messages scroll, chat input is visible ABOVE the keyboard when typing.
- [ ] Send button works and AI replies appear with timestamps.
- [ ] "Book a slot" and "Request time" buttons are visible above the input.
- [ ] On desktop: left sidebar shows, ChatHeader with logo/counselor/client visible.

### Chat Attachments & Voice Notes
- [ ] Paperclip (📎) button opens native file picker.
- [ ] Selecting a JPG/JPEG/PNG → image thumbnail preview strip appears above input.
- [ ] Selecting a PDF/DOCX/XLSX/ZIP → file name + icon preview strip appears.
- [ ] Tapping X on the preview strip clears the pending file.
- [ ] Pressing send with a file → uploading spinner shows → two new bubbles appear (file bubble + AI acknowledgment).
- [ ] Image bubble renders the image inline; tapping it opens the image in a new tab.
- [ ] PDF/DOCX bubble shows file icon + name + external link arrow; tapping opens the file.
- [ ] File over 10 MB → error message "File must be 10 MB or less" appears, no upload.
- [ ] Unsupported file type (e.g. .exe) → rejected by file picker accept filter.
- [ ] Mic (🎤) button: click to start recording → button turns orange and pulses.
- [ ] Speak a sentence → interim transcript appears as grey preview below mic row.
- [ ] Click mic again to stop → transcript moves into input field for review/editing.
- [ ] Press send → message sends as a normal text message with the transcribed text.
- [ ] Voice notes work in Chrome on Android and Chrome desktop.
- [ ] On browsers without Web Speech API → clicking mic shows an alert explaining the limitation.

### Student Portal Pages
- [ ] `/portal?clientId=...` shows pipeline stage badge, counselor name,
  stat cards, pending docs alert, open tasks list.
- [ ] `/student/documents?clientId=...` shows documents with upload buttons.
- [ ] Upload a file → status changes to "uploaded" → View button appears.
- [ ] `/student/meetings?clientId=...` shows meeting list.
- [ ] `/student/complaint?clientId=...` complaint form submits successfully.
```
