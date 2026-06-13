# Counselor Testing Checklist
**URL:** https://acevisa.vercel.app
**Login:** go to `/login` and sign in with a counselor account.
**Pass** = works as described. **Fail** = write what happened instead.

---

## 1. LOGIN

- [ ] Go to `/login`. Enter counselor email and password. Leave **Remember me** unticked. Click Sign in.
  → Should land on `/dashboard`. No error.

- [ ] Log out (or clear cookies). Go directly to `/dashboard` in the address bar.
  → Should redirect to `/login`. (Security check — direct URL access is blocked.)

---

## 2. REMEMBER ME — SESSION SECURITY

- [ ] Log in **without** ticking "Remember me".
  → Close the browser tab completely.
  → Reopen the browser, go to `/dashboard`.
  → Should redirect to `/login`. (Session expired on browser close — correct behaviour.)

- [ ] Log in **with** "Remember me" ticked.
  → Close the browser tab completely.
  → Reopen the browser, go to `/dashboard`.
  → Should still be logged in. (30-day persistent session — correct behaviour.)

---

## 3. DASHBOARD (`/dashboard`)

- [ ] Page loads with your client list.
- [ ] Each client row shows name, phone, pipeline stage, last activity.
- [ ] **Notification bell** (top right) is visible, white icon on dark header.
- [ ] Click the bell → dropdown opens showing recent notifications.
- [ ] Unread notifications show a red dot badge on the bell icon.
- [ ] Click a notification → it marks as read and navigates to the relevant page.

---

## 4. CLIENT LIST

- [ ] Search bar filters clients by name or phone as you type.
- [ ] Pipeline stage filter (if present) shows only clients at that stage.
- [ ] Clicking a client name opens their detail page.

---

## 5. CLIENT DETAIL PAGE

Access: click any client from `/dashboard`.

### Profile Header
- [ ] Shows client name, phone, city, qualification score (0–100).
- [ ] Score colour: green (≥70), orange (40–69), red (<40).

### AI Profile Summary
- [ ] Shows AI-generated profile if the client has chatted.
- [ ] Destination country, visa type, purpose, timeline are displayed.

### Pending Profile Updates
- [ ] If the AI detected a profile change (e.g. client said a different destination), a yellow banner appears at the top.
- [ ] Click **Approve** → the change is applied to the profile.
- [ ] Click **Reject** → the change is dismissed.

### Conversation Digest
- [ ] Summary of the client's chat history is shown.
- [ ] Raw conversation toggle (if present) shows individual messages.

### Service Pathway
- [ ] Shows recommended visa/study pathway based on AI profile.

### Psychological Read
- [ ] Shows client's communication style and motivation notes.

### Talking Points
- [ ] Shows suggested talking points for the upcoming meeting.

### Documents Checklist
- [ ] Lists all documents requested for this client.
- [ ] Status icons: clock (requested), upload arrow (uploaded), green tick (verified).
- [ ] If a document status is "Uploaded" or "Verified", a **View** button appears.
- [ ] Click **View** → file opens in a new browser tab (signed download link).

### Meetings History
- [ ] Shows all meetings (scheduled, completed, cancelled).
- [ ] Each meeting shows date, time (PKT), status.

### Activity History
- [ ] Shows a log of every action taken for this client (meetings, complaints, stage changes, etc.).

### Pipeline Stage
- [ ] Dropdown at the bottom of the profile → change stage → page refreshes → new stage persists.

### Notes
- [ ] Text area → type a note → click **Save notes** → refresh → note still shows.

### Copy Portal Link
- [ ] **Copy portal link** button (top right, next to the back arrow).
- [ ] Click it → button briefly says "Copied!".
- [ ] Paste the copied link in a new browser tab → should open the client's portal home page.
- [ ] Share this link with the client via WhatsApp so they can access their portal.

---

## 6. PRE-MEETING BRIEF

- [ ] On a client detail page, look for a **Generate Brief** button (or brief is auto-generated).
- [ ] Click it → a structured brief appears: profile summary, service pathway, talking points, psychological read.
- [ ] Brief can be printed or saved as PDF.

---

## 7. MEETINGS

- [ ] `/dashboard/meetings` (or from sidebar) → your meetings list loads.
- [ ] Meetings show date, time (PKT), client name, status.
- [ ] Can schedule a new meeting by selecting a time slot.
- [ ] Scheduled meeting appears in the list.

---

## 8. TASKS (`/dashboard/tasks`)

- [ ] Task list loads showing tasks assigned to you.
- [ ] Each task shows client name, title, due date, status.
- [ ] Mark a task complete → it moves to completed state.
- [ ] Overdue tasks are highlighted.

---

## 9. DOCUMENTS (`/dashboard/documents/[clientId]`)

- [ ] Access from a client detail page or sidebar.
- [ ] List of all documents for that client loads.
- [ ] Status of each document is correct (requested / uploaded / verified).
- [ ] Change a document status to **Verified** (if that action exists) → status updates.

---

## 10. NOTIFICATIONS (BELL)

- [ ] When a client submits a complaint, a notification appears in your bell.
- [ ] When an escalation is created by the AI for your client, a notification appears.
- [ ] Clicking a notification navigates to the relevant page.

---

## 11. EMAIL NOTIFICATIONS
> Requires `RESEND_API_KEY` in Vercel.

- [ ] One of your clients books a meeting through the AI chat → you receive an email: "New meeting booked — [client name]" with meeting time.
- [ ] One of your clients triggers an AI escalation → you receive an email: "Client question needs your input" with the client's question.

---

## 12. PWA — INSTALL TO HOME SCREEN

- [ ] On a mobile phone, open `https://acevisa.vercel.app/login` in Chrome or Safari.
- [ ] A banner or browser prompt appears: "Add to Home Screen" or "Install app".
- [ ] Accept → app icon appears on home screen.
- [ ] Tap the icon → app opens full screen without browser address bar.
- [ ] Logo and colours match the ACE Altius branding.

---

## 13. MOBILE LAYOUT

- [ ] On a mobile screen, the sidebar is hidden. A hamburger (☰) icon appears at the top left.
- [ ] Tap hamburger → full-screen drawer opens with all nav links.
- [ ] Logo is visible on the dark header (white background behind logo).
- [ ] All buttons are large enough to tap comfortably (no tiny buttons).
- [ ] Tap outside the drawer → it closes.
