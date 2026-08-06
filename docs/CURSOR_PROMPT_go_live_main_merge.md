# Prompt for Cursor — prepare `dev` for a careful merge into `main`

Goal: get the post-testing-fixes work (`dev`, commit `119cbe3`) safely into `main`
and live, with a review checkpoint before anything actually goes to production.
Do the steps in order. **Do not merge or push to `main` until step 4 explicitly
says to, and only after I've confirmed I've reviewed the change list.**

---

## 1. Sort out the huge uncommitted diff first — don't touch `main` until this is clean

`git status` on `dev` currently shows ~250 modified files, essentially the whole
repo — every route, every component, every migration, `package-lock.json`, the
landing-page SVGs. That's far too broad to be real intentional edits from the work
we just did (the actual fix commit only touched 17 files). Before doing anything
else:

1. Run `git diff --stat` and `git diff --stat -w` (the `-w` flag ignores
   whitespace-only changes) on the working tree and compare the file counts. If
   `-w` shows dramatically fewer files or none, this is a line-ending/whitespace
   normalization issue (likely `core.autocrlf` behaving differently after a system
   change), not real content changes.
2. Also check `git config --get core.autocrlf` — report what it's set to.
3. **Do not run `git checkout -- .` or `git restore .` to discard these changes
   without reporting back first.** Tell me what you found (whitespace noise vs.
   real changes) and let me confirm before anything gets discarded — there's a
   chance some of this is real unsaved work from an earlier session that
   shouldn't be thrown away.
4. If it does turn out to be pure line-ending noise, the clean fix is usually
   setting `core.autocrlf` consistently (e.g. `git config core.autocrlf false` on
   Windows if the repo's committed files are LF) and then either normalizing in
   one deliberate commit or discarding the noise — but confirm with me which,
   don't decide unilaterally.

Working tree must show clean (`git status` clean, nothing but the one real commit
ahead of `main`) before moving to step 2.

---

## 2. Confirm dev and production aren't silently different environments

1. Check whether the Supabase project used locally / in the `dev` preview deploy
   is the **same** Supabase project that production (`main`) points at — compare
   `NEXT_PUBLIC_SUPABASE_URL` (and the project ref) across `.env.local` and
   whatever env vars Vercel has configured for the Production environment vs. the
   `dev` branch's Preview environment.
2. If they're the same project: good — the three new migrations
   (`20260802000000_task_assigned_by.sql`,
   `20260806100000_team_hub_voice_messages.sql`,
   `20260807000000_notification_hierarchy.sql`) are already applied, nothing more
   needed on the DB side for go-live.
3. If they're **different** projects (separate dev/prod databases): those three
   migrations need to be run against the production database before merging, not
   after — report this back rather than assuming.

---

## 3. Confirm Vercel Production environment variables

In the Vercel project dashboard, under Production environment variables, confirm
these are set (not just in local `.env.local`):
- `SES_SMTP_HOST`, `SES_SMTP_USER`, `SES_SMTP_PASSWORD` — required or the SES
  swap will silently no-op exactly like the empty `RESEND_API_KEY` did before.
- Confirm `RESEND_API_KEY` being empty/removed doesn't break anything else (it
  shouldn't — `lib/email.ts` no longer imports the Resend SDK — but grep the repo
  for any other `Resend` references before assuming).

Report which of these are missing. If AWS SES production access hasn't been
granted yet (separate from this task), say so plainly rather than proceeding —
emails will still no-op until that's done, same as before.

---

## 4. Run the build and present the change list — then STOP and wait

1. On `dev`, run `npm run build` locally. Report pass/fail and any errors.
2. Present a plain change list (not just a git diff dump) — group it by feature:
   CEO email isolation, Team Hub voice messages, notification hierarchy, Resend→SES,
   plus anything from step 1 that turned out to be real and worth including.
   For each item: what changed, what it affects, and any residual risk.
3. **Stop here.** Do not merge or push to `main`. Wait for explicit confirmation
   from me that I've reviewed the list and want to proceed.

---

## 5. Only after I confirm — the actual merge

Once I've said go:

```
git checkout main
git pull origin main
git merge --no-ff dev -m "Merge post-testing fixes: Team Hub DMs/boards/voice, task assignment, CEO email isolation, notification hierarchy, Resend->SES"
git push origin main
```

Prefer opening this as a GitHub pull request (`dev` → `main`) instead of a local
merge + push if that's easier to review in the GitHub UI first — either is fine,
but don't force-push, don't rebase `main`, and don't skip the `--no-ff` (keeps the
merge as one clearly identifiable point in history in case a rollback is ever
needed).

After pushing, watch the Vercel deployment build/logs for the production deploy
and confirm it completes successfully before considering this done.

---

## 6. Post-merge smoke test on production (aceyourvisa.com)

- [ ] CEO logs in → Settings → My Email tab appears, `ceo@aceyourvisa.com`
      connects and shows its inbox
- [ ] A branch manager account gets `403` hitting `/api/admin/my-email-config`
      directly
- [ ] Team Hub: post in the bulletin board, send a DM both directions, hold the
      mic button in group chat and in a DM — voice note sends and plays back
- [ ] Assign a task to a counselor from `/admin/counselors` — succeeds
- [ ] Trigger a client escalation/panic/complaint as a test client — assigned
      counselor, their branch manager, and the CEO all get a notification;
      another branch's manager does not
- [ ] Register a client through the receptionist flow — confirmation email
      actually arrives (only if SES production access is confirmed live —
      otherwise expect this to still no-op and that's known/expected)
- [ ] Spot-check the 4 connected counselor mailboxes still show their own inbox
      on `/dashboard/email`
