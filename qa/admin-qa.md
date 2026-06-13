# Admin QA Checklist
URL: https://acevisa.vercel.app/admin
Login: use admin credentials

---

## 1. Authentication & Session

- [ ] **Visit `/admin` without being logged in → should redirect to `/login`**
  Open an incognito window and go to `https://acevisa.vercel.app/admin`. You should land on the login page, not the dashboard.

- [ ] **Visit `/dashboard` while logged in as admin → should redirect to `/admin`**
  After logging in as admin, manually type `/dashboard` in the address bar and press Enter. You should be sent back to `/admin`.

- [ ] **Login with wrong password → error message shown, no redirect**
  On the login page, enter the correct email but a wrong password and click Sign in. A red error message should appear under the button. You should stay on the login page.

- [ ] **Login with correct credentials → lands on `/admin`**
  Enter the correct admin email and password and click Sign in. You should arrive at the admin panel.

- [ ] **Remember Me OFF (default): close browser and reopen → redirected to login**
  Log in without checking Remember Me. Close the entire browser (not just the tab). Reopen it and go to `https://acevisa.vercel.app/admin`. You should be sent to login.

- [ ] **Remember Me ON: close browser and reopen → still logged in**
  Log in with the Remember Me checkbox checked. Close the entire browser. Reopen and go to `/admin`. You should land directly on the admin panel without logging in again.

- [ ] **Forgot password flow works end to end**
  Click "Forgot password?" on the login page. Enter your email and click Send. Check your inbox for the reset email. Click the link in the email, enter a new password, and submit. Then log in using the new password to confirm it works.

- [ ] **Sign out → can't go back in**
  Click Sign out in the sidebar. You should land on `/login`. Press the browser back button. You should stay on login, not re-enter the admin panel.

---

## 2. Visual / Logo Check

- [ ] **Sidebar logo is visible with a white background container**
  Look at the left sidebar on desktop. The ACE logo should sit inside a small white rounded box. The logo should be fully readable — not dark text blending into the dark sidebar.

- [ ] **Mobile header: logo appears in white container**
  Shrink your browser window below 1024px wide (or open on a phone). The top bar should show the logo inside a white pill-shaped background.

- [ ] **Mobile header: notification bell icon is visible**
  On the same mobile-width view, the bell icon in the top-right corner should be white and clearly visible against the dark top bar.

- [ ] **Desktop header: notification bell is dark on light background**
  On desktop (wide screen), the top-right header is light grey. The bell should be a dark icon, clearly visible.

---

## 3. Sidebar Navigation

- [ ] **All nav items render correctly**
  Count the sidebar links: Unassigned, All Clients, Counselors, Meetings, Knowledge Base, Campaigns, Performance, CRM Pipeline, Invoices, P&L Summary, HR Flags, Complaints, Activity Log, Settings. All 14 should be visible.

- [ ] **Active nav item is highlighted**
  Click each nav link. The one you're currently on should have a lime green background highlight.

- [ ] **Unassigned badge count is correct**
  Note the number on the Unassigned badge. Go to the Unassigned page and count the clients. The number should match.

- [ ] **Mobile sidebar opens and closes**
  On mobile width, tap the hamburger menu (top left). The sidebar should slide in from the left. Tap any nav link — the sidebar should close and you should be on the new page.

---

## 4. Unassigned Clients

- [ ] **Page loads a list of unassigned clients**
  Click Unassigned in the sidebar. You should see a list of clients with no counselor yet.

- [ ] **Badge count matches the page count**
  Count the clients listed on the page. It should match the number in the sidebar badge from the previous step.

- [ ] **Assigning a client removes them from the list**
  Pick one client. Choose a counselor from the dropdown next to their name and confirm. The client should disappear from the unassigned list.

- [ ] **Badge count decreases after assignment**
  After assigning, look at the sidebar badge — it should now show one less than before.

---

## 5. All Clients

- [ ] **Table loads with all clients**
  Click All Clients. A table should appear with every client across all counselors. Check that the row count looks right.

- [ ] **Each row shows correct info**
  Scan a few rows. Each should show the client's name, their assigned counselor's name, pipeline stage number, qualification score, and join date.

- [ ] **Clicking a client opens their detail page**
  Click on any client's name or row. You should navigate to that client's detail page.

- [ ] **Transferring a client to a different counselor works**
  On the All Clients table, find the transfer option for a client (button or dropdown). Change their counselor and save. Go back to the table and confirm the counselor name column now shows the new counselor.

---

## 6. Counselors

- [ ] **Counselor list loads correctly**
  Click Counselors. Cards should appear for each active counselor, showing name, email, phone, how many clients they have, and how many open tasks.

- [ ] **View Dashboard opens counselor's portal**
  Click "View Dashboard" on any counselor card. You should see that counselor's dashboard from the admin's perspective, showing their clients and activity.

- [ ] **Counselor pipeline tab works**
  On the counselor dashboard, click the Pipeline tab. Their Kanban board should load with their clients in the correct stages.

- [ ] **Counselor tasks tab works**
  Click the Tasks tab. Their task list should load.

- [ ] **Briefing tab works**
  Click into any meeting listed on the counselor's dashboard. The AI briefing page should load without errors.

---

## 7. Meetings

- [ ] **All meetings load**
  Click Meetings. You should see a list of all meetings across all counselors, with date, time, counselor name, and client name visible.

- [ ] **Empty state is clean**
  If there are no meetings, the page should show a friendly empty message — not a blank screen or error.

---

## 8. Knowledge Base

- [ ] **Existing entries load**
  Click Knowledge Base. Any previously added entries should appear as a list.

- [ ] **Add a new entry**
  Click the Add or New button. Fill in a title and some content. Save it. It should appear immediately in the list.

- [ ] **Edit an existing entry**
  Click edit on any entry. Change the content. Save. Refresh the page. The updated content should still be there.

- [ ] **Delete an entry**
  Click delete on any entry. Confirm the deletion. The entry should disappear from the list.

---

## 9. CRM Pipeline

- [ ] **Kanban board loads without errors**
  Click CRM Pipeline. Columns representing deal stages should appear (lead, proposal, agreement_signed, etc.).

- [ ] **Seeded deals appear in correct columns**
  You should see three deals: one for PKR 95,000 in Proposal, one for PKR 120,000 in Agreement Signed, and one for PKR 25,000 in Lead.

- [ ] **Create a new deal**
  Use the add button to create a new deal. Select a client, counselor, service type, value, and stage. Save it. The new card should appear in the correct column.

- [ ] **Move a deal to a different stage**
  Drag a deal card (or use a stage-change option) to a different column. Refresh the page. The deal should remain in its new column.

---

## 10. Invoices

- [ ] **Invoice list loads**
  Click Invoices. You should see at least two invoices: ACE-2025-001 (Sent, PKR 55,000) and ACE-2025-002 (Draft, PKR 25,000).

- [ ] **Line items are correct**
  Click into ACE-2025-001. It should show two line items: "Germany Study Visa Service Fee - Stage 1" (PKR 40,000) and "Documentation Processing" (PKR 15,000), totalling PKR 55,000.

- [ ] **Create a new invoice**
  Click the New Invoice button. Select a client, add at least one line item with a description and amount, set a due date. Save. The invoice should appear in the list with a new auto-generated number.

- [ ] **Status badges display correctly**
  Draft invoices should show a grey badge, Sent invoices a blue badge, Paid invoices a green badge.

- [ ] **Changing invoice status persists**
  Change a Draft invoice to Sent. Refresh the page. It should still show Sent.

---

## 11. P&L Summary (Finance)

- [ ] **Page loads without error**
  Click P&L Summary. The page should load, not show a blank screen or "coming soon" placeholder.

- [ ] **Expenses are shown**
  You should see 5 expense rows: two salary entries (Hashaam and Aneeqa), Meta ads, office rent, and tools/APIs.

- [ ] **Revenue and totals calculate correctly**
  Check that the totals are numbers — no "NaN", "undefined", or blank cells. The math should add up correctly.

- [ ] **Commission rules visible**
  Commission rates for both counselors (12% for Hashaam, 10% for Aneeqa) should be visible.

---

## 12. HR Flags

- [ ] **Page loads without error**
  Click HR Flags. The page should load cleanly. If there are flags, they should show counselor name, reason, and date. If empty, a clean empty state message.

---

## 13. Complaints

- [ ] **Page loads as a placeholder**
  Click Complaints. The page should load and show placeholder text — it's not yet fully built. Confirm there's no error, just the placeholder message.

---

## 14. Activity Log

- [ ] **Loads chronological events**
  Click Activity Log. A list of logged actions should appear in reverse chronological order (newest first).

- [ ] **Each entry is complete**
  Scan a few rows. Each should show a timestamp, who performed the action, what they did, and which client it relates to.

---

## 15. Settings

- [ ] **Page loads**
  Click Settings. The page should load without any error.

---

## 16. Notifications

- [ ] **Badge count shows unread notifications**
  If there are unread notifications, the bell icon in the top-right should show an orange badge with a number.

- [ ] **Dropdown opens on click**
  Click the bell icon. A dropdown panel should slide open showing a list of notifications.

- [ ] **Each notification shows correct icon and info**
  Each entry should show a type-specific icon (e.g. calendar for meeting requests, shield for panic), a title, and a time-ago label.

- [ ] **Clicking a notification navigates correctly**
  Click a notification. The dropdown should close, the notification should be marked as read, and you should be taken to the relevant page.

- [ ] **Mark all read clears the badge**
  Click "Mark all read" inside the dropdown. The orange badge on the bell should disappear.

---

## 17. PWA (Mobile)

- [ ] **Android install prompt appears**
  Open `https://acevisa.vercel.app` in Chrome on Android. Tap the three-dot menu. You should see "Add to Home Screen" or "Install App".

- [ ] **iOS install prompt appears**
  Open the site in Safari on iPhone. Tap the Share button (box with arrow). You should see "Add to Home Screen" in the share sheet.

- [ ] **Installed app opens correctly**
  After installing, tap the icon on your home screen. The app should open without any browser address bar or tabs — full screen.

- [ ] **App icon is the ACE logo**
  The home screen icon should show the ACE Altius logo, not a generic icon.

- [ ] **Status bar colour is dark green**
  When the app is open, the phone's status bar (top bar with time and battery) should be dark green (#0A3F3A), matching the app's theme.

- [ ] **Login required if not authenticated**
  If not logged in, opening the installed app should show the login screen.
