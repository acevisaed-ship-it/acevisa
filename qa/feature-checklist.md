# ACE Altius Portal — Feature Checklist
> Test at: https://acevisa.vercel.app
> Check each box when confirmed working. Note any issues in the margin.

---

## 👤 ADMIN
Login: go to `/login`, sign in with admin credentials.

### Dashboard
- [ ] `/admin` loads — shows 8 KPI cards (clients, counselors, complaints, tasks, meetings, revenue, pipeline, overdue)
- [ ] Numbers are real (not all zeros)

### Clients
- [ ] `/admin/clients` — list of all clients loads
- [ ] Click a client → detail page opens
- [ ] "Copy portal link" button appears top-right → click it → check clipboard has a URL like `https://acevisa.vercel.app/portal?clientId=...`
- [ ] Pipeline stage dropdown changes and saves (refresh page, stage should still show new value)

### Complaints
- [ ] `/admin/complaints` — list loads with Open/Acknowledged filter
- [ ] Click "Acknowledge" on an open complaint → status changes

### Escalations
- [ ] `/admin/escalations` — list loads
- [ ] Click "Mark Resolved" → moves to resolved tab

### Meetings
- [ ] `/admin/meetings` — all meetings across counselors visible

### Activity Log
- [ ] `/admin/activity` — log entries load, "Load more" button works

### HRM
- [ ] `/admin/hrm` — payroll page loads, month picker works
- [ ] Commission table shows counselors (may be empty if no deals closed this month — try a past month)

### Team Management
- [ ] `/admin/team` — counselor list loads with client counts
- [ ] Click pencil icon → edit name inline → green tick saves it
- [ ] "Deactivate" button changes status (don't deactivate yourself)

### Settings
- [ ] `/admin/settings` — page loads (not a spinner forever)
- [ ] Toggle a notification switch → click "Save Changes" → refresh page → toggle should still be in new position

### CRM / Finance
- [ ] `/admin/crm` — deals pipeline loads
- [ ] `/admin/finance` — revenue/expense summary loads

---

## 🧑‍💼 COUNSELOR
Login: go to `/login`, sign in with counselor credentials.

### Dashboard
- [ ] `/dashboard` — loads with client list and task panel
- [ ] Notification bell (top right) is visible and clickable

### Client Detail
- [ ] Click any client → detail page loads
- [ ] "Copy portal link" button top-right → copies link to clipboard
- [ ] Pipeline stage dropdown → change stage → refresh → stage persists
- [ ] Notes field → type something → "Save notes" → refresh → note persists

### Documents
- [ ] On a client detail page, scroll to Documents Checklist section
- [ ] If a document has been uploaded by the client, a "View" button appears → click it → opens file in new tab

### Meetings
- [ ] `/dashboard/meetings` (or from client detail) — meetings list loads
- [ ] Can schedule a new meeting slot

### Session / Remember Me
- [ ] Log out, then go to `/dashboard` directly — should redirect to `/login`
- [ ] Log in **without** ticking "Remember me" → close the browser tab → reopen and go to `/dashboard` → should redirect to login
- [ ] Log in **with** "Remember me" ticked → close tab → reopen → should still be logged in

---

## 🎓 STUDENT / CLIENT
> Access via the portal link a counselor copies: `https://acevisa.vercel.app/portal?clientId=YOUR_ID`
> Replace `YOUR_ID` with a real client UUID from the admin panel.

### Portal Home
- [ ] Page loads with client's name and application stage badge
- [ ] Shows meeting count, documents needed count, pending actions count
- [ ] "Open Chat" button links to chat page
- [ ] "Documents" button links to documents page

### Chat
- [ ] `/student/chat?clientId=...` — chat loads, can send a message, AI responds

### Meetings
- [ ] `/student/meetings?clientId=...` — meetings list loads (or "No meetings yet" message)

### Documents
- [ ] `/student/documents?clientId=...` — document list loads
- [ ] If a document is in "Requested" status → "Upload" button appears
- [ ] Click Upload → pick a PDF or image → progress shows → status changes to "Uploaded"
- [ ] Try uploading a file over 10 MB → should get an error message

### Complaint
- [ ] `/student/complaint?clientId=...` — form loads
- [ ] Fill in subject + details → Submit → confirmation screen with reference ID appears

---

## 📧 EMAIL NOTIFICATIONS
> These require `RESEND_API_KEY` set in Vercel environment variables.

- [ ] Submit a complaint as a student → admin email inbox receives "New complaint" email
- [ ] Book a meeting as a student → counselor email inbox receives "New meeting booked" email
- [ ] Trigger an AI escalation (ask the chat something it can't answer) → counselor receives "Client question needs your input" email
