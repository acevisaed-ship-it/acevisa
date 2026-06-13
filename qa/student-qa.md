# Student / Client QA Checklist
Access: link-based — no password needed. URL format: `/student/chat?clientId=<uuid>`
To test: get a real client ID from the Supabase dashboard (clients table) and append it to the URL.

---

## 1. Access & Navigation

- [ ] **Visiting without a clientId redirects to home**
  Go to `https://acevisa.vercel.app/student/chat` with no `?clientId=` in the URL. You should be redirected to the homepage, not shown an error.

- [ ] **Visiting with an invalid clientId redirects to home**
  Go to `/student/chat?clientId=fake-id-that-doesnt-exist`. You should be redirected to the homepage — not shown a database error or blank page.

- [ ] **Visiting with a valid clientId loads the chat page**
  Go to `/student/chat?clientId=<real-uuid>`. The page should load and show the client's name somewhere in the header or chat area.

- [ ] **Sidebar nav items are all present**
  On desktop, you should see four items in the left sidebar: My Chat, My Meetings, My Documents, Raise a Complaint.

- [ ] **Each nav item keeps the clientId in the URL**
  Click each nav item. Look at the address bar — the `?clientId=...` parameter should still be there on every page. Without it, pages would fail to load.

- [ ] **Each nav item goes to the right page**
  Click My Chat → chat page. My Meetings → meetings list. My Documents → documents list. Raise a Complaint → complaint form. None should go to a 404.

---

## 2. Visual / Logo Check

- [ ] **Desktop sidebar: logo has a white background**
  On desktop, the ACE logo at the top of the dark green sidebar should sit inside a small white rounded box. The logo text and icon should be clearly readable — not dark-on-dark and invisible.

- [ ] **Mobile top bar: logo has a white background**
  Shrink the browser below 1024px (or test on a phone). The logo in the dark top bar should also have a white container behind it.

- [ ] **Active nav item is highlighted in lime green**
  Click each nav item. The one you're on should have a green background highlight.

- [ ] **No text or icons are invisible**
  Scan the page for any buttons, icons, or text that look like they've disappeared (same colour as their background). Report any you find.

---

## 3. My Chat

- [ ] **Previous messages load in order**
  Open the chat page. Any past messages between this client and their counselor should be visible, oldest at the top and newest at the bottom.

- [ ] **Sending a message works**
  Type something in the message input at the bottom and press Send or hit Enter. Your message should appear in the chat thread immediately.

- [ ] **Messages appear on the correct side**
  The client's messages should appear on one side of the chat, the counselor's on the other.

- [ ] **Timestamps are visible**
  Hover over or look at any message. It should show when it was sent — either an exact time or "X minutes ago" style label.

- [ ] **Long messages wrap inside the bubble**
  Type a very long sentence (e.g. copy-paste a paragraph) and send it. The text should wrap within the message bubble — not overflow off the right edge of the screen.

- [ ] **Empty chat shows a clean state**
  If this client has no chat history, you should see a friendly empty state message — not a blank white page or a JavaScript error.

- [ ] **Sending a message and refreshing shows it persisted**
  Send a message. Refresh the page. The message should still be there in the thread.

---

## 4. My Meetings

- [ ] **Page loads without error**
  Click My Meetings. The page should load — no blank screen, no error message.

- [ ] **Meetings are listed with correct details**
  If this client has any meetings, each entry should show the meeting date, time, and counselor's name.

- [ ] **Empty state is clean**
  If there are no meetings, a friendly message like "No meetings yet" should appear — not a blank space or error.

---

## 5. My Documents

- [ ] **Page loads without error**
  Click My Documents. The page should load cleanly.

- [ ] **Uploaded documents are listed**
  If there are any documents shared with this client, they should appear with a file name, type, and upload date.

- [ ] **Downloading/viewing a document works**
  Click on any document in the list. It should open in a new tab or start downloading — not show a broken link or error.

- [ ] **Uploading a new document works**
  Click the upload button (if available to the client). Choose a file from your device. After uploading, the file should appear in the list without needing to refresh.

- [ ] **Empty state is clean**
  If no documents exist, a friendly empty state message should show.

---

## 6. Raise a Complaint

- [ ] **Complaint form loads correctly**
  Click Raise a Complaint. A form should appear with a Subject field and a Details text area.

- [ ] **Client name and phone are pre-filled**
  Because you're accessing via a clientId link, the form should already know who you are. The name and phone fields should be pre-filled (or hidden, since they're not needed).

- [ ] **Submitting with empty subject shows a validation error**
  Leave the Subject field blank and try to submit. An error message should appear telling you the subject is required. The form should not submit.

- [ ] **Submitting with empty details shows a validation error**
  Fill in the subject but leave the Details area blank. Try to submit. An error should appear saying details are required.

- [ ] **Valid complaint submits successfully**
  Fill in both Subject and Details with real text. Click Submit. A success screen should appear with a reference ID (a short string of letters and numbers) and the message "We'll be in touch within 24 hours."

- [ ] **Reference ID appears on success**
  After submitting, the confirmation screen should show a reference number like "a89eefd6" (first 8 characters of a UUID). Note it down.

- [ ] **Anonymous complaint works (no clientId)**
  Open the complaint page without a clientId: `https://acevisa.vercel.app/student/complaint`. Name and phone fields should now appear. Fill them in along with subject and details. Submit. It should succeed with a reference ID.

---

## 7. Mobile Responsiveness

- [ ] **All pages usable at phone width (390px)**
  Test the entire student flow on a phone or with the browser shrunk to phone width. Chat, meetings, documents, and complaint form should all be readable and usable without horizontal scrolling.

- [ ] **Mobile sidebar opens and closes**
  Tap the hamburger icon in the top-left. The sidebar should slide in. Tap a nav link — the sidebar should close.

- [ ] **Chat input stays visible when the keyboard opens**
  On a phone, tap the chat message input box. When the on-screen keyboard appears, the input field should stay visible just above it — not disappear behind the keyboard.

- [ ] **Complaint form is easy to fill on mobile**
  Open the complaint form on a phone. All input fields should be large enough to tap, and the keyboard should not cover the submit button.

- [ ] **All tap targets are large enough**
  No buttons, links, or icons should require precise pixel-level tapping. Everything should feel easy to tap with a thumb.

---

## 8. Error States

- [ ] **Invalid clientId shows a clean redirect, not a crash**
  Already tested in Section 1. Confirm the page never shows a raw error message like "TypeError" or a Next.js error screen.

- [ ] **Chat send failure shows a user-friendly message**
  To test this: disconnect your internet (turn on airplane mode), try to send a chat message. A friendly error message should appear. The message should not silently disappear.

- [ ] **Document upload failure shows a message**
  If a document upload fails (e.g. file too large or wrong type), an error message should appear explaining why — not a silent failure.

---

## 9. Public Schedule Page

URL: `https://acevisa.vercel.app/schedule/<clientId>`

- [ ] **Page loads without login**
  Open this URL in an incognito window. It should load without asking you to log in.

- [ ] **Available meeting slots are shown**
  Time slots for scheduling a meeting should be visible.

- [ ] **Booking a slot creates a meeting**
  Select a time slot and complete the booking. A confirmation should appear. The counselor should receive a notification.

---

## 10. Public Chat Page

URL: `https://acevisa.vercel.app/chat/<clientId>`

- [ ] **Page loads without login**
  Open this URL in an incognito window. It should load without asking you to log in.

- [ ] **Chat works for the correct client**
  Send a message. It should appear in the thread and be visible to the counselor on their end.

- [ ] **No counselor-only content is visible**
  The page should not show anything that should be restricted to staff — no admin controls, no counselor notes, no HR flags.
