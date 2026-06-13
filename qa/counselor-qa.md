# Counselor QA Checklist
URL: https://acevisa.vercel.app/login
Login: use a counselor account (non-admin role)

---

## 1. Authentication & Session

- [ ] **Visit `/dashboard` without being logged in → redirects to login**
  Open an incognito window and go to `https://acevisa.vercel.app/dashboard`. You should land on the login page, not the dashboard.

- [ ] **Visit `/admin` while logged in as counselor → redirects to `/dashboard`**
  After logging in as a counselor, type `/admin` in the address bar. You should be sent back to `/dashboard`.

- [ ] **Wrong password shows an error**
  On the login page, enter the right email but wrong password. Click Sign in. A red error message should appear. You should stay on the login page.

- [ ] **Correct login lands on `/dashboard`**
  Enter correct counselor email and password. Click Sign in. You should arrive at the counselor dashboard.

- [ ] **Remember Me OFF: session ends when browser closes**
  Log in without checking Remember Me. Close the entire browser window (not just the tab). Reopen Chrome/Safari and go to `/dashboard`. You should be redirected to login.

- [ ] **Remember Me ON: session survives browser close**
  Log in with Remember Me checked. Close the entire browser. Reopen and go to `/dashboard`. You should land on the dashboard without needing to log in again.

- [ ] **Forgot password flow works**
  Click "Forgot password?" Enter your email and click Send. Check your inbox. Click the reset link, enter a new password, and submit. Log in using the new password to confirm.

- [ ] **Sign out works and back button doesn't re-enter**
  Click Sign out in the sidebar footer. You land on `/login`. Press the browser back button. You should stay on login, not go back into the dashboard.

---

## 2. Visual / Logo Check

- [ ] **Sidebar logo is visible and readable**
  On desktop, look at the top of the left sidebar. The ACE logo should sit inside a white rounded container, clearly visible against the dark background.

- [ ] **Mobile top bar: logo is in a white container**
  Shrink the browser below 1024px or test on a phone. The logo in the dark top bar should be inside a white pill-shaped background — not invisible on the dark surface.

- [ ] **Mobile top bar: bell icon is white and visible**
  On the mobile view, the bell icon in the top-right corner should be white and clearly visible against the dark top bar.

- [ ] **Active nav item is highlighted**
  Click each nav item. The one you're currently on should have a lime green background.

- [ ] **Counselor name in sidebar footer is readable**
  Look at the bottom of the sidebar. Your name should appear in light text on the dark background.

---

## 3. Sidebar Navigation

- [ ] **All four nav items appear**
  The sidebar should show: Today's Briefing, Pipeline, Tasks, Clients.

- [ ] **Each link navigates correctly**
  Click each one and confirm you reach the right page (briefing, pipeline board, task list, client list).

- [ ] **Mobile hamburger opens and closes the sidebar**
  On mobile, tap the hamburger icon in the top-left. The sidebar should slide in. Tap a nav link — the sidebar should close and you should be on the new page.

---

## 4. Today's Briefing (Dashboard Home)

- [ ] **Page loads without any error**
  After login, confirm the briefing page loads with content — not a blank screen or spinner that never stops.

- [ ] **Today's meetings count is shown**
  There should be a card or summary showing how many meetings you have today.

- [ ] **Overdue or due-today tasks are flagged**
  If any tasks are due today or overdue, they should be highlighted or counted somewhere on the dashboard.

- [ ] **Recent activity is shown**
  The page should show recent actions for your clients (document uploads, messages, profile updates, etc.).

- [ ] **Meeting cards link to the right places**
  Click any meeting card shown on the dashboard. It should take you to that client's detail page or briefing, not a 404.

---

## 5. Pipeline

- [ ] **Kanban board loads**
  Click Pipeline. Columns for each pipeline stage should appear (e.g. Lead, Contacted, In Progress, Applied, etc.).

- [ ] **Your clients appear in correct stages**
  Your clients should appear in the columns that match their pipeline stage. Cross-check one or two against what you know.

- [ ] **Moving a client to a different stage persists**
  Drag a client card (or use a stage-change control) to a different column. Refresh the page. The client should still be in the new column.

- [ ] **Empty stages show cleanly**
  Any column with no clients should show an empty placeholder — not an error or a broken layout.

---

## 6. Tasks

- [ ] **Your task list loads**
  Click Tasks. Your assigned tasks should appear as a list.

- [ ] **Each task shows key info**
  Each row should show the task title, which client it's for, the due date, and whether it's done or pending.

- [ ] **Overdue tasks are visually flagged**
  Tasks with a due date in the past should be highlighted in red or orange — not look the same as future tasks.

- [ ] **Completing a task works**
  Click the checkbox or complete button on a task. It should update immediately (change appearance or move to a completed section). Refresh — it should still show as completed.

- [ ] **Tasks without due dates display cleanly**
  If a task has no due date, the date column should show a dash or "No due date" — not blank or broken.

---

## 7. Clients List

- [ ] **Only your clients are shown**
  Click Clients. The list should only show clients assigned to you — not other counselors' clients.

- [ ] **Each client row shows correct info**
  Name, pipeline stage, and qualification score should all be visible per client.

- [ ] **Clicking a client navigates to their detail page**
  Click any client's name. You should go to their full detail/brief page.

---

## 8. Client Detail Page

### Profile
- [ ] **All profile fields display**
  The client's name, contact info, nationality, education level, and target country should all be visible.

- [ ] **Pipeline stage is shown and editable**
  The current stage should be displayed. If there's a way to change it, update it and confirm it saves on refresh.

### AI Brief
- [ ] **Brief sections all render**
  The brief page should show: Profile Summary, Conversation Digest, Service Pathway, Psychological Read, Talking Points, Documents Checklist, Activity History, Meetings History. Click through each section — none should be blank or show an error.

- [ ] **Strategy chat works**
  Type a question in the strategy chat input (e.g. "What should I focus on in this meeting?") and send it. An AI response should appear within a few seconds.

### Documents
- [ ] **Document list loads**
  Click the Documents tab for a client. Any uploaded documents should appear as a list with name, type, and date.

- [ ] **Uploading a new document works**
  Click upload, choose a file, and submit. The file should appear in the list immediately.

- [ ] **Viewing/downloading works**
  Click on a document. It should open or download without errors.

### Activity History
- [ ] **Events are listed in order**
  The activity history for this client should show events newest-first with timestamps and the name of who performed each action.

### Meetings History
- [ ] **Past and upcoming meetings are listed**
  Both past meetings (with notes) and upcoming ones should appear. Dates and times should be correct.

---

## 9. Chat (Counselor ↔ Client)

- [ ] **Chat loads with message history**
  Open any client's chat. Previous messages should load in the correct order — oldest at top, newest at bottom.

- [ ] **Sending a message works**
  Type a message and press Send or Enter. Your message should appear in the thread immediately.

- [ ] **Messages are on the correct side**
  Your messages should appear on one side (right), the client's on the other (left).

- [ ] **Long messages wrap correctly**
  Type a very long message and send it. It should wrap within the bubble — not overflow off the screen.

- [ ] **Timestamps are shown**
  Each message should show when it was sent (time or time-ago label).

---

## 10. Meeting Requests

- [ ] **Meeting request notification arrives**
  If a client submits a meeting request, a notification badge should appear on the bell icon.

- [ ] **Accepting a meeting adds it to the dashboard**
  Accept the meeting request. It should now appear in Today's Briefing under upcoming meetings.

---

## 11. Notifications

- [ ] **Badge count shows on the bell**
  If you have unread notifications, an orange badge with a count should appear on the bell.

- [ ] **Dropdown opens when you click the bell**
  Click the bell. A panel should open with your notifications listed.

- [ ] **Each notification type has the right icon**
  Panic alerts should show a red shield, meeting requests a blue calendar, chat messages a blue speech bubble, complaints a red megaphone, profile updates a green user icon.

- [ ] **Clicking a notification marks it read and navigates**
  Click any notification. The badge should decrease by one, and you should be taken to the relevant page (e.g. the client's detail page).

- [ ] **Mark all read clears the badge**
  Click "Mark all read" at the top of the notification dropdown. The orange badge on the bell should disappear entirely.

- [ ] **Notifications refresh automatically**
  Leave the page open for a few minutes. If you trigger a new notification from another session (e.g. send a message as the client), it should appear within 30 seconds without refreshing the page.

---

## 12. Profile Picture

- [ ] **Default avatar shows if no picture uploaded**
  If you haven't uploaded a picture, a default avatar (initials or placeholder) should appear in the sidebar and header.

- [ ] **Uploading a picture updates the display**
  Click on your avatar and upload a photo. It should update in the sidebar footer and header immediately.

- [ ] **Picture persists after refresh**
  Refresh the page. Your uploaded picture should still be there.

---

## 13. Mobile Responsiveness

- [ ] **All pages usable at phone width**
  Open the site on a phone or shrink the browser to 390px wide. Navigate through Briefing, Pipeline, Tasks, Clients, and a client detail page. Nothing should be cut off or unreadable.

- [ ] **Pipeline is usable on mobile**
  The Kanban columns should be scrollable horizontally on small screens — not all squished together.

- [ ] **Chat input stays visible when keyboard opens**
  On a phone, tap into the chat message input. When the keyboard appears, the input box should stay visible above it, not be hidden behind the keyboard.

- [ ] **All tap targets are big enough**
  Buttons, links, and nav items should all be easy to tap without needing to be precise. Nothing should require tapping a tiny area.

---

## 14. PWA

- [ ] **Site can be installed to home screen**
  On mobile, open the site and follow the "Add to Home Screen" steps. The app should install with the ACE logo as the icon.

- [ ] **Opens to login if not authenticated**
  After installing, if you're not logged in, tapping the home screen icon should open the login page.

- [ ] **After login, goes to dashboard**
  Log in through the installed app. You should land on `/dashboard` as normal.

- [ ] **No browser UI visible in standalone mode**
  When using the installed app, the browser's address bar and tabs should not be visible. It should look like a native app.
