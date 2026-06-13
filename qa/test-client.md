# Client / Student Testing Checklist
**How to get a test link:** Log in as admin or counselor → open any client's detail page → click "Copy portal link" → paste it in a new browser tab.

The URL will look like: `https://acevisa.vercel.app/portal?clientId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Pass** = works as described. **Fail** = write what happened instead.

---

## 1. PORTAL HOME (`/portal?clientId=...`)

- [ ] Page loads without crashing.
- [ ] Shows the client's name in the welcome banner.
- [ ] Application stage badge is correct (e.g. "Initial Consultation", "Documents Required", etc.).
- [ ] Assigned counselor name appears below the stage badge.
- [ ] "Client since [date]" shows the correct registration date.
- [ ] **3 stat cards** show correct counts: Total Meetings, Documents Needed, Pending Actions.
- [ ] If a meeting is scheduled, a blue "Next meeting" banner shows the date.
- [ ] If documents are requested, an orange banner says "[N] document(s) requested" with a link.
- [ ] If there are open tasks, a list of action items appears.
- [ ] **"Open Chat"** button → navigates to the chat page.
- [ ] **"Documents"** button → navigates to the documents page.

---

## 2. SIDEBAR NAVIGATION

- [ ] Sidebar (desktop) or hamburger menu (mobile) shows: My Chat, My Meetings, My Documents, Raise a Complaint.
- [ ] Logo is visible on the dark green sidebar (white background behind it).
- [ ] Each link works and opens the correct page.
- [ ] On mobile: hamburger icon at top left opens a full-screen drawer with nav links. Tap outside to close.

---

## 3. AI CHAT (`/student/chat?clientId=...`)

### Basic chat
- [ ] Chat loads with a welcome message from the AI.
- [ ] Type a message and press Enter (or Send button) → AI replies within a few seconds.
- [ ] Messages appear in a scrollable conversation thread.
- [ ] Your messages appear on the right, AI replies on the left.

### AI knowledge
- [ ] Ask "What documents do I need for a UK student visa?" → AI gives a relevant answer.
- [ ] Ask "What are your office hours?" → AI answers from the knowledge base.
- [ ] Ask something completely unrelated (e.g. "What is the weather in Tokyo?") → AI politely redirects to visa/education topics.

### Meeting booking through chat
- [ ] Tell the AI you want to book a meeting (e.g. "I'd like to schedule a consultation").
- [ ] AI should offer available time slots or confirm a booking.
- [ ] After confirming, go to `/student/meetings?clientId=...` → the new meeting should appear there.
- [ ] Counselor should receive a "New meeting booked" email (if Resend is configured).

### Escalation — question the AI can't answer
- [ ] Ask a very specific question the AI cannot answer (e.g. "My visa was refused last year for a specific medical reason, can I still apply?").
- [ ] AI should respond that it has flagged the question and a counselor will respond.
- [ ] Admin: check `/admin/escalations` → the escalation should appear there.
- [ ] Counselor: check email → should receive "Client question needs your input".

### Language
- [ ] If the client types in Urdu, AI should reply in Urdu.
- [ ] Switch back to English → AI replies in English.

---

## 4. MEETINGS (`/student/meetings?clientId=...`)

- [ ] Page loads showing all meetings for this client.
- [ ] Each meeting shows: date, time (PKT), status badge (Scheduled / Completed / Cancelled).
- [ ] If no meetings exist: message "No meetings scheduled yet" is shown.

---

## 5. DOCUMENTS (`/student/documents?clientId=...`)

### Viewing documents
- [ ] Page loads with a list of all documents requested for this client.
- [ ] Each document shows its name and current status (Requested / Uploaded / Verified).

### Uploading a document
- [ ] Find a document with "Requested" status. An **Upload** button appears next to it.
- [ ] Click **Upload** → your device's file picker opens.
- [ ] Select a **PDF file** → uploading spinner appears → status changes to "Uploaded". ✓
- [ ] Refresh the page → document still shows "Uploaded" status. ✓
- [ ] Repeat with a **JPG or PNG image** → should also upload successfully. ✓
- [ ] On a "Uploaded" document, an "Re-upload to replace" label appears and the Upload button is still shown → upload a new file → replaces the old one. ✓

### File validation
- [ ] Try uploading a file larger than 10 MB → should show an error message "File too large (max 10 MB)". ✓
- [ ] A "Verified" document has no Upload button (counselor has verified it, no changes allowed). ✓

### Counselor sees the upload
- [ ] Log in as the counselor → open this client's detail page → scroll to Documents Checklist.
- [ ] The uploaded document now shows a **View** button → click it → the uploaded file opens in a new tab. ✓

---

## 6. RAISE A COMPLAINT (`/student/complaint?clientId=...`)

- [ ] Form loads with Subject and Details fields.
- [ ] If the client's name and phone are already in the system, name/phone fields are pre-filled.
- [ ] Leave Subject empty → click Submit → error: "Subject and details are required."
- [ ] Fill in Subject and Details → click Submit.
  → Confirmation screen appears with: "Your complaint has been submitted." and a Reference ID.
- [ ] Admin: check `/admin/complaints` → new complaint appears at the top with status "Open".
- [ ] Admin email inbox receives "New complaint — [client name]" email (if Resend is configured).

---

## 7. ACCESS WITHOUT CLIENT ID

- [ ] Go to `https://acevisa.vercel.app/portal` (no `?clientId=` in the URL) → should redirect to homepage, not crash.
- [ ] Go to `/student/chat` (no clientId) → same — should redirect, not show a broken page.
- [ ] Go to `/student/documents` (no clientId) → same.

---

## 8. COMPLAINT WITHOUT BEING LOGGED IN (Public form)

- [ ] Go to `/student/complaint` with no clientId.
- [ ] Form shows extra fields: "Your name" and "Your phone" (because client is unknown).
- [ ] Fill all fields and submit → confirmation screen appears.
- [ ] Admin: `/admin/complaints` → complaint shows with the manually entered name/phone.

---

## 9. MOBILE EXPERIENCE

- [ ] Open the portal link on a mobile phone.
- [ ] Portal home page is readable without horizontal scrolling.
- [ ] Chat input box and Send button are easy to tap.
- [ ] Document upload button is large enough to tap.
- [ ] Meetings and documents lists scroll smoothly.
