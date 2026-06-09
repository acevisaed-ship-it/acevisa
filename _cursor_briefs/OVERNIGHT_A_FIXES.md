# OVERNIGHT A — Bug Fixes
## AceVisa.co | Run this first

Read PROJECT_CONTEXT.md before starting.

After each fix: run `npm run build`. At the end of all fixes: run `vercel --prod`.

---

## FIX 1 — Brief page 404

**File:** `src/app/(counselor)/dashboard/brief/[meetingId]/page.tsx`

**Problem:** Line 23 filters by `.eq('counselor_id', counselor.id)` — if the meeting is assigned to a different counselor, or the admin is viewing, it returns `notFound()`.

**Fix:** Change the meeting query from:
```
.eq('id', meetingId)
.eq('counselor_id', counselor.id)
```
To:
```
.eq('id', meetingId)
```
Then after fetching the meeting, add this check:
```
if (!meeting) notFound()

// Only block access if this counselor is not the assigned one AND not an admin
const { data: counselorRecord } = await supabase
  .from('counselors')
  .select('role')
  .eq('id', counselor.id)
  .single()

const isAdmin = counselorRecord?.role === 'admin'
if (!isAdmin && meeting.counselor_id !== counselor.id) notFound()
```

This allows admins to view any brief and counselors to view their own.

---

## FIX 2 — Admin redirect (verify + force redeploy)

**File:** `src/app/(counselor)/login/page.tsx`

The redirect logic on line 58 already reads:
```typescript
router.push(counselor.role === 'admin' ? '/admin' : '/dashboard')
```

The middleware also correctly redirects admin away from `/dashboard`.

These are correct in code. The issue is likely a stale Vercel deployment or cached session.

**Fix:** Do not change the code. Instead:
1. Run `vercel --prod` to force a fresh deployment
2. After deploy, clear browser cookies for acevisa.vercel.app and log in fresh

If the redirect STILL fails after a fresh login on the new deployment, add this debug log temporarily:
```typescript
console.log('counselor role:', counselor.role, '→ redirecting to:', counselor.role === 'admin' ? '/admin' : '/dashboard')
```
Check Vercel function logs to confirm what role is being read.

---

## FIX 3 — 405 on assign (verify)

**File:** `src/app/api/admin/clients/[clientId]/assign/route.ts`

The route already exports `export async function POST(...)` correctly.

**Fix:** This is likely also a stale deployment issue. The `vercel --prod` in Fix 2 will resolve it. No code change needed.

If it still returns 405 after deploy, check that the file path is exactly:
`src/app/api/admin/clients/[clientId]/assign/route.ts`
Any casing or bracket mismatch will break Next.js routing.

---

## FIX 4 — Middleware deprecation warning

**File:** `src/middleware.ts`

Next.js 16 warns that the `middleware` file convention is deprecated. This is a non-blocking warning but should be cleaned up.

**Fix:** Add this comment at the top of the file and nothing else — the actual rename to `proxy.ts` would require verifying Next.js 16 docs first. For now just suppress:

Actually — do NOT rename the file yet. The deprecation warning is for a different Next.js config, not the standard middleware.ts pattern. Leave this file exactly as-is.

Remove this fix from the list.

---

## FIX 5 — Tailwind module type warning

**File:** `package.json`

**Fix:** Open `package.json` and add `"type": "module"` at the top level if it is not already there:
```json
{
  "type": "module",
  "name": "acevisa",
  ...
}
```

Run `npm run build` immediately after. If it breaks anything, revert this change — some Next.js configs are incompatible with `"type": "module"`.

---

## FIX 6 — Meeting reschedule for counselors

**What to build:** Counselors should be able to change the date and time of any booked meeting from their client profile page.

**Files to change:**
- `src/components/brief/MeetingsHistorySection.tsx` — add a reschedule button per meeting
- `src/app/api/meetings/[meetingId]/reschedule/route.ts` — NEW API route

**Step A — New API route**

Create `src/app/api/meetings/[meetingId]/reschedule/route.ts`:

```
export async function PATCH(request, { params })
  - Authenticate counselor
  - Get meetingId from params
  - Get newScheduledTime from request body (ISO string)
  - Verify the meeting belongs to this counselor (or counselor is admin)
  - Update meetings table: scheduled_time = newScheduledTime, status = 'scheduled'
  - Log activity: action_type = 'meeting_rescheduled', description = 'Meeting rescheduled to [new time]'
  - Create notification for the counselor: 'Meeting rescheduled — [client name]'
  - Return { success: true, scheduledTime: newScheduledTime }
```

**Step B — UI in MeetingsHistorySection**

Next to each "View Brief →" link, add a "Reschedule" button that:
- Opens a small inline form showing a datetime-local input pre-filled with the current meeting time
- On submit, calls PATCH `/api/meetings/[meeting.id]/reschedule` with the new ISO time
- On success, refreshes the page (`router.refresh()`) and shows "Rescheduled" confirmation
- On error, shows "Could not reschedule"

The button should only show for meetings with status `scheduled` — not for `completed` or `cancelled`.

Style: use the same button style as the existing "Schedule a Meeting →" button but smaller, text only.

---

## DONE WHEN

- [ ] Brief page loads for any counselor/admin without 404
- [ ] `vercel --prod` deployed successfully
- [ ] Admin login redirects to `/admin` after fresh cookie-cleared login
- [ ] Assign API returns 200 not 405
- [ ] Meeting reschedule button appears on client profile meetings section
- [ ] PATCH `/api/meetings/[meetingId]/reschedule` returns 200
- [ ] `npm run build` passes with no errors

## NEXT STEP
Open `_cursor_briefs/OVERNIGHT_B_MOCK_DATA.md` in a new Cursor agent window and begin immediately.
