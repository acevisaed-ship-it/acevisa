# Team Management — CEO/admin password reset for counselor & receptionist accounts

**Deploy note from Hashaam: once this is built and verified working, commit and
push directly to `main`. This has full approval — do not stop to ask for
further authorization before pushing.**

## Important scope correction — "check password" isn't buildable, here's why

The original ask was to let CEO/admin "change or check" a staff member's
password. Only the change/reset half is actually possible. Supabase Auth (like
every reputable auth system) stores passwords as one-way hashes — there is no
plaintext value anywhere to retrieve, not even via the service-role key. The
only way to make an existing password "visible" would be to log or store it in
plaintext somewhere at the moment it's set, which is a real security liability
and something this project shouldn't do. So this spec implements **reset only**:
CEO/admin sets a new, known password (typed or auto-generated) — the same
pattern already used for creating new counselor accounts and for the client
`set-password` flow elsewhere in this codebase. That fully covers the
practical need (staff forgot their password, staff account needs recovery)
without the plaintext-storage problem.

## 1. Scope correction: receptionists aren't in Team Management today

`GET /api/admin/team` currently filters `.in('role', ['counselor', 'admin'])`
— receptionists never show up on this page at all (they're created via
`/api/admin/counselors/create` but not listed here). Since the ask is
explicitly "counselor and receptionist accounts," extend this filter to
`.in('role', ['counselor', 'admin', 'receptionist'])` so receptionists appear
in the Team Management table for the first time. Flag this clearly in the PR
description since it's a visible behavior change, not just the password
feature.

## 2. New endpoint: `POST /api/admin/team/[id]/reset-password`

Mirror the auth pattern already used in
`api/admin/counselors/[counselorId]/deactivate/route.ts` (look up the
counselor row, find their Supabase auth user, act on it via `admin.*`).

```ts
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, passwordChangedEmailHtml } from '@/lib/email'
import { logStaffActivity } from '@/lib/activityLog'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const { password: providedPassword } = await request.json() as { password?: string }

  const supabase = createAdminClient()
  const { data: target } = await supabase
    .from('counselors')
    .select('id, name, email, role, branch_id')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (!['counselor', 'receptionist'].includes(target.role)) {
    return NextResponse.json({ error: 'Can only reset counselor or receptionist passwords here' }, { status: 400 })
  }

  // Branch-scoped admins can only reset accounts in their own branch; CEO unrestricted.
  if (isBranchScopedAdmin(admin) && target.branch_id !== admin.branch_id) {
    return NextResponse.json({ error: 'Not in your branch' }, { status: 403 })
  }

  const newPassword = providedPassword?.trim() || generateTempPassword() // reuse existing helper, see note below

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const authUser = authUsers?.users?.find((u) => u.email === target.email)
  if (!authUser) return NextResponse.json({ error: 'No linked login account found' }, { status: 404 })

  const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword })
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Notify the account owner — they should know their password was changed by an admin,
  // same principle as the existing self-service passwordChangedEmailHtml notification.
  await sendEmail({
    to: target.email,
    subject: 'Your password was reset by an administrator',
    html: passwordChangedEmailHtml({
      name: target.name,
      whenPKT: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
    }),
  })

  await logStaffActivity({
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'password_reset',
    description: `${admin.name} reset the password for ${target.name} (${target.role})`,
    metadata: { targetId: target.id, targetRole: target.role },
  })

  return NextResponse.json({
    success: true,
    // Only return the password in the response if it was auto-generated (admin needs
    // to relay it) — never echo back a password the admin typed themselves.
    ...(providedPassword?.trim() ? {} : { generatedPassword: newPassword }),
  })
}
```

`generateTempPassword()` already exists in
`api/receptionist/register-client/route.ts` — move it to a shared location
(e.g. `src/lib/auth/generateTempPassword.ts`) and import it in both places
rather than duplicating it.

Note the deactivate/delete routes look up the auth user via
`listUsers().find(u => u.email === ...)` rather than a stored `auth_user_id`
— follow that same existing pattern here for consistency, but if
`counselors` actually has an `auth_user_id` column (check schema — `clients`
does, worth confirming whether `counselors` does too), prefer a direct lookup
by ID over scanning `listUsers()`, it's more reliable if a counselor's email
was ever changed after their auth user was created.

## 3. UI — `TeamManagement.tsx`

Add a "Reset password" action per row (small icon button, e.g. a key icon
from `lucide-react`, alongside the existing edit/status controls). On click,
open a small inline panel or modal with two options: "Generate temporary
password" (calls the endpoint with no `password` field, then displays the
returned `generatedPassword` once, same one-time-reveal pattern already used
in the receptionist registration success screen) or "Set a specific password"
(text input, admin types it, nothing is echoed back). Show a confirmation
before submitting — this is a real account-access change for someone else,
worth a "Reset password for {name}?" confirm step rather than a single click.

## Verification

- CEO can reset a counselor and a receptionist password; branch-scoped admin
  can only reset accounts within their own branch (test both).
- Auto-generated password is shown once, works for actual login immediately
  after.
- Custom-typed password is never echoed back in the response.
- Target account receives the "password reset by an administrator" email.
- Action shows up in staff activity log.
- Receptionists now appear in the Team Management table (new, confirm this
  doesn't break anything relying on the old counselor/admin-only list).
