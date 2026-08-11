# Remaining email gaps — meeting reminders, document requests, invoice receipts, counselor welcome

Depends on `CURSOR_INSTRUCTIONS_branded_email_templates.md` (shared `wrap()`/`ctaButton()` shell in `src/lib/email.ts`) being applied first. Check what's already been done before starting — some of this may already be in progress.

## 0. Two real bugs found while investigating, not just missing features

**`src/app/api/notifications/send/route.ts` is dead legacy code from before the SES migration.** It still imports and uses `Resend` (`new Resend(process.env.RESEND_API_KEY)`), sends `from: 'AceVisa <noreply@acevisa.co>'` (the old domain, old branding, unrelated to the current `sendEmail()`/`aceyourvisa.com` setup), and has this hardcoded bug:

```ts
// clients table has no email field — email is collected in Phase 2.
const clientEmail: string | null = null
```

This comment is stale — `clients.email` exists and is used everywhere else in the app. Because of this hardcoded `null`, **every meeting confirmation and meeting reminder email to a client silently no-ops today** (`recipient` is always `null` for clients, so it logs "skipping send" and moves on — no error, just quietly does nothing). This route needs a full rewrite, not a patch.

**`src/app/api/admin/counselors/create/route.ts` never actually emails a new counselor.** It calls `supabase.auth.admin.generateLink({ type: 'magiclink', ... })` but never uses the result — `generateLink` only *generates* a link, it doesn't send anything by itself (unlike `inviteUserByEmail`, which does send). The call's return value isn't even captured. So today, when an admin/CEO creates a new staff account, the new hire gets no email at all — whoever created the account has to tell them their login details manually.

## 1. Fix meeting confirmation/reminders (rewrite `notifications/send/route.ts`)

Replace the Resend-based logic entirely with `sendEmail()` from `src/lib/email.ts`. Add three new branded templates there:

```ts
export function meetingConfirmationEmailHtml(opts: { clientName: string; counselorName: string; whenPKT: string; }) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">You're booked, ${opts.clientName}!</h2>
    <p>Your meeting with <strong>${opts.counselorName}</strong> is confirmed.</p>
    <p style="font-size:18px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:16px;border-radius:12px;margin:16px 0">${opts.whenPKT} PKT</p>
    <p>Your counselor will review your case before the meeting — come with any questions you have.</p>`)
}

export function meetingReminder24hEmailHtml(opts: { clientName: string; counselorName: string; whenPKT: string; }) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">See you tomorrow, ${opts.clientName}!</h2>
    <p>Reminder — your meeting with <strong>${opts.counselorName}</strong> is:</p>
    <p style="font-size:18px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:16px;border-radius:12px;margin:16px 0">${opts.whenPKT} PKT</p>
    <p>Need to reschedule? Message your counselor directly through the portal.</p>`)
}

export function meetingReminder2hEmailHtml(opts: { clientName: string; counselorName: string; whenPKT: string; }) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">Almost time, ${opts.clientName}!</h2>
    <p>Your meeting with <strong>${opts.counselorName}</strong> starts in 2 hours:</p>
    <p style="font-size:18px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:16px;border-radius:12px;margin:16px 0">${opts.whenPKT} PKT</p>`)
}
```

Rewrite `notifications/send/route.ts`'s body to: fetch `client.email` (add it to the existing `.select('name, phone')` → `.select('name, phone, email')`), use it as the recipient for the three meeting types, call `sendEmail()` with the matching template instead of `resend.emails.send()`, and drop the `RESEND_API_KEY` check entirely (matches the same non-fatal pattern `sendEmail()` already has — if SMTP env vars aren't set, it just logs and skips, same net effect without needing a second provider check). Keep the `escalation_alert` branch's logic the same, just swap the `resend.emails.send()` call for `sendEmail()` too, and move its HTML into a template function in `email.ts` for consistency (this one already existed as `escalationEmailHtml` — check whether it matches this route's inline version or if the inline one is a stale duplicate to remove).

Keep the `messages_log` insert at the end as-is — that's just internal delivery tracking, unrelated to which provider sent it.

## 2. Actually trigger meeting reminders (nothing calls this today)

`src/app/api/meetings/reminders/route.ts` already exists and correctly finds meetings 24h and ~2h out — but nothing invokes it. Add a Vercel Cron job. Create `vercel.json` at the repo root (or add to it if one exists elsewhere — check first):

```json
{
  "crons": [
    { "path": "/api/meetings/reminders", "schedule": "*/15 * * * *" }
  ]
}
```

Every 15 minutes covers both the 23–25h window and the 105–135min window in that route without gaps. Vercel automatically sends an `Authorization: Bearer $CRON_SECRET` header on cron-triggered requests if `CRON_SECRET` is set as an env var — add that env var and a guard at the top of the route:

```ts
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  // ...existing logic
}
```

This prevents anyone from hitting the endpoint publicly and spamming reminder emails. Generate a random `CRON_SECRET` value and set it in Vercel env vars (Production only — cron only runs in production).

## 3. Document request notification

`src/app/api/documents/request/route.ts` currently only inserts a `documents` row and logs activity — no email to the client at all. Add a template:

```ts
export function documentRequestedEmailHtml(opts: { clientName: string; documentName: string; portalUrl: string; }) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">A document is needed for your application</h2>
    <p>Hi ${opts.clientName},</p>
    <p>Your counselor has requested the following document:</p>
    <p style="font-size:16px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:14px 16px;border-radius:12px;margin:16px 0">${opts.documentName}</p>
    <p>Please upload it through your portal as soon as you're able.</p>
    ${ctaButton(opts.portalUrl, 'Upload document →')}`)
}
```

In the route, add `email` to the existing client select (`.select('id, name')` → `.select('id, name, email')`), and after the successful `documents` insert, call `sendEmail()` with this template if `client.email` exists (non-blocking, don't fail the request if the email fails).

## 4. Invoice payment receipt

`src/app/api/admin/invoices/[id]/payment/route.ts` records the payment and marks the invoice paid, but never emails the client a receipt. Add a template:

```ts
export function paymentReceiptEmailHtml(opts: {
  clientName: string
  invoiceNumber: string
  amount: string
  currency: string
  paidAtPKT: string
  lineItems: { description: string; amount: number }[]
}) {
  const rows = opts.lineItems
    .map((i) => `<tr><td style="padding:6px 0">${i.description}</td><td style="padding:6px 0;text-align:right">${i.amount.toLocaleString()}</td></tr>`)
    .join('')
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Payment received — thank you!</h2>
    <p>Hi ${opts.clientName},</p>
    <p>We've received your payment for invoice <strong>${opts.invoiceNumber}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F4F5F4;border-radius:12px;padding:12px">
      ${rows}
      <tr><td style="padding:10px 0 0;font-weight:bold;border-top:1px solid #E6E8E7">Total paid</td><td style="padding:10px 0 0;font-weight:bold;text-align:right;border-top:1px solid #E6E8E7;color:#E48328">${opts.currency} ${opts.amount}</td></tr>
    </table>
    <p style="font-size:13px;color:#0A3F3A99">Paid on ${opts.paidAtPKT}</p>`)
}
```

In the payment route, fetch the client's email + name (the current select only pulls `id, client_id, total, currency, status` for the invoice — add a join or a second query for `clients(name, email)`), and after the successful invoice-status update to `paid`, send this receipt. Non-blocking, same pattern as everywhere else.

## 5. Counselor/staff welcome email (fixes the dead-code bug from section 0)

In `src/app/api/admin/counselors/create/route.ts`, remove the unused `generateLink` call and replace with an actual branded welcome email — since the admin/CEO creating the account already sets the password directly in the form, don't put that password in the email (avoid emailing plaintext passwords). Instead:

```ts
export function counselorWelcomeEmailHtml(opts: { name: string; email: string; loginUrl: string; }) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Welcome to the team, ${opts.name}!</h2>
    <p>Your ACE Altius Consulting staff account has been created.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F4F5F4;border-radius:12px">
      <tr><td style="padding:10px 16px;font-weight:bold;width:120px">Login email:</td><td style="padding:10px 16px">${opts.email}</td></tr>
    </table>
    <p>Your manager will share your temporary password with you separately. Please change it after your first login.</p>
    ${ctaButton(opts.loginUrl, 'Go to staff login →')}`)
}
```

Call this after the counselor row is successfully inserted, using `${new URL(request.url).origin}/login` as the login URL (same origin pattern already used elsewhere in that file).

## Verification

- Book a test meeting, confirm the confirmation email actually arrives at the client's real email (this was silently broken before — confirm it's genuinely fixed, not just "no error thrown").
- Manually trigger `/api/meetings/reminders` (or wait for the cron) with a test meeting scheduled ~24h and ~2h out, confirm both reminder emails arrive.
- Confirm the cron endpoint rejects requests without the correct `CRON_SECRET` header once that's wired in.
- Request a document from a test client, confirm the email arrives.
- Record a test invoice payment, confirm the receipt email arrives with correct line items and total.
- Create a test counselor account, confirm the welcome email arrives (this was silently broken before too).
