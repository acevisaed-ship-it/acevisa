# Branded password reset/invite emails + reset page restyle + password-changed confirmation

Depends on `CURSOR_INSTRUCTIONS_branded_email_templates.md` being applied first (the shared `wrap()`/`ctaButton()` branded shell in `src/lib/email.ts`) — this doc builds on that. Check git history first; if the branded shell isn't in yet, do that one first.

## 1. Branded password-reset and account-invite emails (Supabase dashboard, not code)

These two emails are triggered by `supabase.auth.resetPasswordForEmail()` (in `api/student/auth/forgot-password/route.ts` and the counselor login page) and `supabase.auth.admin.inviteUserByEmail()` (also in `forgot-password/route.ts`, for first-time student setup). Both are sent by Supabase's own mailer, not `src/lib/email.ts` — this is configured entirely in the Supabase dashboard, no code change:

**Supabase Dashboard → Authentication → SMTP Settings:** enable "Custom SMTP" and enter whichever SMTP credentials the app ends up using (Bluehost `noreply@aceyourvisa.com` per `CURSOR_INSTRUCTIONS_own_domain_smtp.md`, or Brevo — whichever was actually set up). This makes Supabase send auth emails through the same sender as everything else instead of Supabase's own shared mail servers.

**Supabase Dashboard → Authentication → Email Templates:** there are separate templates for "Reset Password" and "Invite user" (and others — leave the rest alone unless asked). Replace each template's HTML with the same branded shell used in `email.ts` — logo header on dark teal, orange accent bar, white body, footer with tagline. Example for the Reset Password template:

```html
<div style="margin:0;padding:32px 16px;background-color:#E6E8E7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#0A3F3A;padding:28px 24px;">
        <img src="https://aceyourvisa.com/logo.png" alt="ACE Altius Consulting" width="120" style="display:block;border:0;max-width:120px;background-color:#ffffff;border-radius:10px;padding:8px 12px;" />
      </td>
    </tr>
    <tr><td style="height:4px;background-color:#E48328;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr>
      <td style="padding:32px 28px;color:#0A3F3A;font-size:15px;line-height:1.6;">
        <h2 style="margin:0 0 16px;color:#0A3F3A;">Reset your password</h2>
        <p>We received a request to reset the password for your ACE Altius Consulting account. Click below to choose a new password.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td style="background-color:#0A3F3A;border-radius:24px;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;color:#B7C733;text-decoration:none;font-weight:bold;font-size:14px;">Reset password →</a>
        </td></tr></table>
        <p style="margin-top:24px;font-size:13px;color:#0A3F3A99;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#F4F5F4;padding:20px 28px;text-align:center;border-top:1px solid #E6E8E7;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0A3F3A;">ACE Altius Consulting</p>
        <p style="margin:0;font-size:11px;color:#0A3F3A99;">From Dreams to Destinations</p>
      </td>
    </tr>
  </table>
</div>
```

Use `{{ .ConfirmationURL }}` exactly — that's Supabase's template variable for the actual reset link, don't hardcode a URL. Do the same for the "Invite user" template, adjusting copy to "Set up your account" / "Set your password →", using `{{ .ConfirmationURL }}` again (Supabase uses the same variable name across templates — verify in the dashboard's template editor, it shows available variables per template).

## 2. Restyle `src/app/(public)/reset-password/page.tsx`

Currently on the old light theme (`bg-grad-teal` outer, light `bg-grad-bg crisp` card) — inconsistent with every other auth-adjacent page, which are now all on the dark glass-card-blue treatment. Bring it in line with `src/app/(counselor)/login/page.tsx` / `src/app/(student)/portal/login/page.tsx`:

- Outer wrapper: `style={{ background: 'var(--grad-blue)' }}`, same as student login/return pages.
- Logo: same translucent glassmorphic backing (`inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/80 px-3 py-2 backdrop-blur-md crisp`, `h-12` or `h-14` img).
- Card: `glass-card-blue` instead of `bg-grad-bg crisp`.
- Inputs: `glass-input` class instead of the current light `inputClassName`.
- Text colors: white/white-60 instead of `text-blue`/`text-text`, matching the dark theme's text conventions elsewhere.
- Optional: add `SectionOrangePlaneToLogo` from `@/components/landing/HeroAnimations` the same way the other pages do, for full visual consistency — not required but matches the rest.

No logic changes — this page's `handleSubmit` (`supabase.auth.updateUser`) stays exactly as-is; this is a styling-only pass, same constraint as when the other login pages were restyled.

## 3. New: password-changed confirmation email

Doesn't exist today. Add a new template function in `src/lib/email.ts`:

```ts
export function passwordChangedEmailHtml(opts: { name: string; whenPKT: string }) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Your password was changed</h2>
    <p>Hi ${opts.name},</p>
    <p>This is a confirmation that the password for your ACE Altius Consulting account was changed on ${opts.whenPKT} (Pakistan time).</p>
    <p style="margin-top:16px;font-size:13px;color:#0A3F3A99;">If this wasn't you, please contact us immediately so we can secure your account.</p>`)
}
```

**Trigger point 1 — `src/app/api/set-password/route.ts`:** this route is already server-side and already has `client.email`. Add `name` to the existing `.select('auth_user_id, email')` call (→ `.select('auth_user_id, email, name')`), and after the successful `portal_password_set` update at the end of the route, call:

```ts
import { sendEmail, passwordChangedEmailHtml } from '@/lib/email'
// ...
if (client.email) {
  await sendEmail({
    to: client.email,
    subject: 'Your password was changed',
    html: passwordChangedEmailHtml({
      name: client.name ?? 'there',
      whenPKT: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
    }),
  })
}
```
Fire this after the response-worthy work is done — don't block/fail the route if the email send fails (matches `sendEmail`'s existing non-fatal error handling).

**Trigger point 2 — `src/app/(public)/reset-password/page.tsx`:** this flow runs entirely client-side via the Supabase JS SDK (`supabase.auth.updateUser`), so there's no existing server-side hook to send from. Add a small new route, `src/app/api/auth/notify-password-changed/route.ts`:

```ts
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { sendEmail, passwordChangedEmailHtml } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createAdminClient()

  // This page is shared by counselors and clients — figure out which one is logged in.
  const counselor = await getAuthenticatedCounselor()
  let email: string | null = null
  let name = 'there'

  if (counselor) {
    email = counselor.email
    name = counselor.name
  } else {
    // Fall back to checking the client session the same way the student chat auth does.
    // (Use whatever existing helper resolves the current authenticated client — check
    // src/lib/supabase/server.ts for the client-side equivalent of getAuthenticatedCounselor
    // before writing a new one; reuse it if it exists.)
  }

  if (email) {
    await sendEmail({
      to: email,
      subject: 'Your password was changed',
      html: passwordChangedEmailHtml({
        name,
        whenPKT: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
      }),
    })
  }

  return NextResponse.json({ success: true })
}
```

Then in `reset-password/page.tsx`, after `setSuccess(true)` in `handleSubmit`, fire-and-forget a call to this route:
```ts
fetch('/api/auth/notify-password-changed', { method: 'POST' }).catch(() => {})
```
Non-blocking — don't await it before showing the success state, and don't fail the password reset if this call fails.

Check `src/lib/supabase/server.ts` first for an existing "get current authenticated client" helper (parallel to `getAuthenticatedCounselor`) before writing new lookup logic — this codebase likely already has one given how much of the app resolves the current client session.

## Verification

- Trigger a real password reset for both a counselor and a client account, confirm the email arrives branded (logo, colors) rather than Supabase's default gray template.
- Confirm the reset-password page visually matches the other login pages (dark theme, glass card, logo backing).
- Change a password via both `set-password` (first-time client setup) and the reset-password page, confirm the "password was changed" confirmation email arrives in both cases with the correct name.
