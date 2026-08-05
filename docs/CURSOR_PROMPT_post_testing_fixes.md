# Prompt for Cursor — finish the post-testing fixes

Paste this whole thing into Cursor as one task. Some of this may already be done
from earlier work — **check current state before changing anything in each
section**, skip what's already implemented, and only build what's missing. Work
through the sections in order; several depend on the one before it. Report back
after each section with what you found already done vs. what you built.

Don't touch anything not listed here. In particular, do **not** run
`docs/CURSOR_INSTRUCTIONS_wipe_all_test_data.md` as part of this — that's a
separate, deliberate, one-time action for go-live, run manually later, not a bug
fix.

---

## 0. Before starting

Confirm `.env.local` has Supabase service-role access and you can run SQL against
the live database (Supabase SQL editor or CLI). Several sections below depend on a
migration having actually been run — this project's migrations are **not** applied
automatically, so "the code looks right but it doesn't work" almost always means
"the migration was never run." Check the DB state directly, don't just read the
code and assume.

---

## 1. Team Hub: private messages, bulletin board posts, chat input focus

**Spec:** `docs/CURSOR_INSTRUCTIONS_team_hub_fixes.md`

**Check first:**
- In Supabase SQL editor: does `direct_messages` table exist? Do `team_posts` have
  `board` and `due_date` columns? (`select column_name from information_schema.columns
  where table_name = 'team_posts';`)
- In `src/components/team/TeamHub.tsx` and `DirectChat.tsx`: is there already an
  `autoFocus` on the message `<input>`, and a `key={activeDmTab.peerId}` on the
  rendered `<DirectChat>` so it remounts when switching DM tabs?

**If missing:** run the migration from the spec, add the `autoFocus`/`key` fixes
exactly as described there.

**Verify:** post in the group bulletin board (Highlights/Updates/Deadlines) as
admin/CEO — it should actually post. Send a DM between two counselor accounts —
both directions should work without a page refresh. Switch between two open DM
tabs and start typing immediately without clicking into the input first.

---

## 2. Team Hub: voice messages

**Spec:** `docs/CURSOR_INSTRUCTIONS_team_hub_voice_messages.md`

**Check first:**
- Do `team_messages` and `direct_messages` have `attachment_url`,
  `attachment_name`, `attachment_type` columns?
- Do `src/app/api/team/messages/voice/route.ts` and
  `src/app/api/team/dm/[peerId]/voice/route.ts` already exist?
- Does `TeamHub.tsx` (group chat) and `DirectChat.tsx` already have a mic button
  and audio playback in the message bubble?

**If missing:** implement per the spec — migration, both voice upload routes,
and the frontend mic button + playback in both `GroupChat` and `DirectChat`, reusing
`useVoiceRecorder` and the same pointer-event hold-to-record pattern already
working in `src/components/chat/ChatInput.tsx`.

**Verify:** hold the mic button in Team chat and in a DM, release, confirm a
playable voice note appears with a transcript (or `[Voice note]` if speech wasn't
clear). Test on an actual phone or touch emulation, not just desktop mouse events.

---

## 3. Task assignment failing

**No new spec needed** — this was diagnosed as a skipped migration, not a code
bug. `src/app/api/admin/counselors/[counselorId]/tasks/route.ts` matches
`docs/CURSOR_INSTRUCTIONS_task_assignment.md` already.

**Check first:** `select column_name from information_schema.columns where
table_name = 'tasks' and column_name = 'assigned_by';` — if that returns no rows,
the migration `supabase/migrations/20260802000000_task_assigned_by.sql` was never
run.

**If missing:** run that migration.

**Verify:** as a branch manager or CEO, assign a task to a counselor from
`/admin/counselors`. It should succeed and the counselor should see it on their
task list. If it still fails after the migration is confirmed present, get the
exact error text from the browser console / network tab — the cause is something
else and needs fresh diagnosis, not a repeat of this fix.

---

## 4. Individual counselor mailboxes

**Spec:** `docs/CURSOR_INSTRUCTIONS_bulk_counselor_mailboxes.md`

**Check first:** in cPanel (or via the UAPI `Email::list_pops` call), which of
these mailboxes already exist: `aneeqa@`, `arooj@`, `osama@`, `marrium@`
(`admin@` already exists, skip it). In `/admin/counselors`, which counselor cards
already show "Email connected" rather than "Connect email account"?

**If missing:** you have Bluehost API access — use it directly (cPanel UAPI
`Email::add_pop`) to create whichever of the 4 counselor mailboxes don't exist
yet, using the host/port values already in the spec (`box2422.bluehost.com`,
IMAP 993, SMTP 465). Then connect each one through the existing
`/admin/counselors` → **Connect email account** flow (or directly via
`POST /api/admin/counselors/{id}/email-config` if you're scripting it end-to-end).
Generate a random password per mailbox, don't reuse one across accounts, and
report the generated passwords back once in your response so they can be saved to
a password manager — don't leave them only in shell history.

**Verify:** each of the 4 counselors' `/dashboard/email` shows their own inbox,
sending works, and a test email sent to e.g. `sara@` doesn't show up in another
counselor's connected inbox. (`fd@aceyourvisa.com` — receptionist — is
intentionally out of scope for now.)

---

## 5. CEO email isolation

**Spec:** `docs/CURSOR_INSTRUCTIONS_ceo_email_isolation.md`

**Check first:** does `src/app/api/admin/my-email-config/route.ts` exist? Does
`src/app/api/admin/counselors/[counselorId]/email-config/route.ts` already have a
branch-ownership check using `isBranchScopedAdmin()`? Does `/admin/settings` show
a "My Email" tab when signed in as `role = 'ceo'`, and not for `role = 'admin'`?

**If missing:** implement per the spec exactly — the branch-ownership check on the
existing route, the new CEO-only route that always uses the authenticated CEO's
own `admin.id` (never a client-supplied id), and the new Settings tab gated to
`ceo` role only.

**Then:** using the Bluehost API access, create the `ceo@aceyourvisa.com` mailbox
if it doesn't already exist (same host/port values as the others), and connect it
through the new CEO-only "My Email" settings tab — not through
`/admin/counselors`, which shouldn't be able to reach it at all after this fix.

**Verify:** exactly as listed in the spec's test checklist — specifically, confirm
a branch-manager account gets `403` both from `/api/admin/my-email-config`
directly and from `POST /api/admin/counselors/{ceo's-id}/email-config`.

---

## 6. Notification hierarchy

**Spec:** `docs/CURSOR_INSTRUCTIONS_notification_hierarchy.md`

**Check first:** does the `notifications` table have the index
`notifications_counselor_id_created_at_idx`? Does `src/lib/notifications.ts`
already fan client-relevant notifications out to branch managers and the CEO
(look for a `NO_FAN_OUT` list or similar branch/ceo lookup), or does
`createNotification()` still only insert one row for the single `counselorId`
passed in?

**If missing:** run the migration, replace `lib/notifications.ts` with the
version in the spec. No other file needs to change — all 11 existing call sites
already pass `clientId` when the event is client-relevant.

**Verify:** as in the spec's checklist — a panic/escalation/complaint/meeting
request/profile update/new client registration notifies the assigned counselor,
their branch manager, and the CEO; a routine chat message notifies only the
counselor; a task assignment notifies only the assignee.

---

## 7. Resend → SES migration (closes out "no confirmation email to new clients")

**Spec:** `docs/CURSOR_INSTRUCTIONS_resend_to_ses.md`

This is the actual fix for testing bug #6 ("no confirmation email to new
receptionist-registered clients") — `src/app/api/receptionist/register-client/route.ts`
already calls `sendEmail()` for the welcome email, it's just been a no-op because
`RESEND_API_KEY` was never set. Swapping to SES per the spec makes that call
actually send.

**Check first:** is `RESEND_API_KEY` set in `.env.local`? Does `lib/email.ts`
still import the `Resend` SDK, or has it already been swapped to nodemailer +
SES SMTP? Are `SES_SMTP_HOST` / `SES_SMTP_USER` / `SES_SMTP_PASSWORD` present in
`.env.local`?

**Heads up — this one isn't pure code.** It requires AWS-side setup that only the
account owner can do: verifying the `aceyourvisa.com` domain in SES, requesting
production access (moves SES out of sandbox mode — this has an approval wait,
it's not instant), and generating SMTP credentials. If those AWS steps haven't
been done yet, flag that back rather than guessing at credentials or leaving
placeholders that silently fail like the Resend key did. Implement the code side
(the `lib/email.ts` swap) regardless so it's ready the moment AWS access comes
through.

**Verify:** register a client via the receptionist flow → confirmation email
actually arrives in the client's inbox. Also spot-check that counselor
account-creation and password-reset emails (which go through Supabase's own
email system, separate from this) still work — this migration shouldn't touch
those.

---

## When done

Reply with a short status per section: already done / just implemented / blocked
(and on what). Don't touch `wipe_all_test_data.md` — that stays a manual,
separate step for whenever the system is ready for go-live.
