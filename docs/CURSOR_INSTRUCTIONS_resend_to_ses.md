# Cursor instructions: switch system emails from Resend to Amazon SES

## Why

`src/lib/email.ts` sends every automated system email (client welcome emails,
complaint alerts, meeting confirmations) through Resend, gated on `RESEND_API_KEY`
which is currently unset — these emails aren't going out at all right now. Decision
made: use Amazon SES instead of paying for Resend, because at the volume expected
once marketing ramps up (potentially 500+/day), SES's pay-per-email pricing
(~$0.10 per 1,000 emails) comes out far cheaper than Resend's flat $20/mo tier, with
no loss of deliverability quality — SES is the same class of provider (dedicated
sender reputation, DKIM/SPF/DMARC), unlike routing this volume through a Bluehost
mailbox, which was ruled out due to shared-hosting spam/suspension risk at that scale.

Sender domain: **aceyourvisa.com** (e.g. `noreply@aceyourvisa.com`) — separate from
whatever `acevisa.co` is used for elsewhere in the app; this only affects where
`lib/email.ts`'s automated emails claim to come from.

This does **not** touch the Bluehost mailbox work already done — that's a completely
separate code path (`lib/email/config.ts`, the counselor "connect your email" feature,
and the webmail tab) that keeps working exactly as configured.

---

## Before Cursor can run anything — one-time human steps in the AWS Console

None of this is scriptable blind; it requires an actual AWS account login and a few
console actions, plus one manual approval step from AWS that can't be automated.

1. **Create/use an AWS account** at https://aws.amazon.com if one doesn't already
   exist. Requires a card on file, but nothing is charged until emails are actually
   sent.
2. **Verify the domain in SES.** SES Console → **Verified identities** → **Create
   identity** → Domain → `aceyourvisa.com`. Choose **Easy DKIM**. This generates a set
   of DNS records (typically one domain-verification `TXT` and three `CNAME` records
   for DKIM) — these are account-specific, generated at verification time. Copy them
   exactly as shown; don't reuse example values from documentation.
3. **Also set up a custom MAIL FROM domain** (same identity's settings page → **MAIL
   FROM domain**) — e.g. `mail.aceyourvisa.com`. This is optional but meaningfully
   improves deliverability by aligning SPF with the visible From address, which is the
   entire point of choosing SES over a shared-hosting mailbox for this. It generates
   one additional `MX` and one `TXT` record.
4. **Request production access.** By default every new SES account is in a sandbox
   that can only send to individually pre-verified email addresses — real client
   registrations would silently fail to receive anything until this is lifted. SES
   Console → **Account dashboard** → **Request production access**. Describe the use
   case (transactional account/notification emails for an education consultancy
   platform) and expected volume (up to ~2,000/day during marketing pushes). Usually
   approved within 24 hours — there's nothing to do but wait once submitted.
5. **Create SMTP credentials.** SES Console → **SMTP settings** → **Create SMTP
   credentials**. This creates a dedicated IAM user formatted for SMTP AUTH — copy the
   generated username and password immediately, shown once. Also note the **SMTP
   endpoint** shown on that same page (region-specific, e.g.
   `email-smtp.us-east-1.amazonaws.com` — matches whichever AWS region the identity
   was created in, don't assume a region).
   ```bash
   export SES_SMTP_HOST="email-smtp.<your-region>.amazonaws.com"
   export SES_SMTP_USER="the-smtp-username"
   export SES_SMTP_PASSWORD="the-smtp-password"
   ```
6. **GoDaddy API key** — reuse from the earlier domain-connect task if still valid.

Same rule as every credential in this project: export as local env vars, never commit,
never paste into chat.

---

## 1. Add the DNS records to GoDaddy

Using the exact values SES showed in step 2 and 3 above (placeholders below — replace
every `SES_...` value with what the console actually generated for this account):

```bash
# Domain verification TXT
curl -X PUT "https://api.godaddy.com/v1/domains/aceyourvisa.com/records/TXT/_amazonses" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"SES_VERIFICATION_TOKEN\", \"ttl\": 600}]"

# DKIM CNAMEs — repeat for each of the three SES gives you, only the host/data change
curl -X PUT "https://api.godaddy.com/v1/domains/aceyourvisa.com/records/CNAME/SES_DKIM_TOKEN_1._domainkey" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"SES_DKIM_TOKEN_1.dkim.amazonses.com.\", \"ttl\": 600}]"
```

If the custom MAIL FROM domain was set up in step 3, also add its `MX` and `TXT`
records the same way SES's setup page shows them.

Re-check verification status in the SES console every few minutes — it flips to
**Verified** once DNS propagates, usually within minutes.

## 2. Code change — `src/lib/email.ts`

Only the top of the file changes (import + sender setup + `sendEmail`). Every email
template function below it (`complaintEmailHtml`, `escalationEmailHtml`,
`studentWelcomeEmailHtml`, `meetingBookedEmailHtml`) stays exactly as-is — and every
caller across the app (`register-client`, `complaints`, `meetings/schedule`,
`notifications/send`) needs **zero changes**, since `sendEmail()`'s signature doesn't
change.

Replace:
```ts
import { Resend } from 'resend'

const FROM = 'ACE Altius Consulting <noreply@acevisa.co>'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

type SendOptions = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendOptions): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set — skipped:', subject)
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[email] send error:', err)
  }
}
```

with:
```ts
import nodemailer from 'nodemailer'

const FROM = 'ACE Altius Consulting <noreply@aceyourvisa.com>'

function getTransporter() {
  if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASSWORD) return null
  return nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST ?? 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false, // STARTTLS on 587, not implicit TLS
    auth: {
      user: process.env.SES_SMTP_USER,
      pass: process.env.SES_SMTP_PASSWORD,
    },
  })
}

type SendOptions = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendOptions): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.log('[email] SES_SMTP_USER/SES_SMTP_PASSWORD not set — skipped:', subject)
    return
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
  } catch (err) {
    // Non-fatal — log and continue, same behavior as before
    console.error('[email] send error:', err)
  }
}
```

`nodemailer` is already a project dependency (used by the counselor SMTP-send route),
so no `npm install` is needed. `resend` can stay in `package.json` unused for now, or
be removed with `npm uninstall resend` once this is confirmed working in production —
not urgent either way.

## 3. Env vars

Add to `.env.local` and to the Vercel project's Environment Variables (same two-place
pattern as the Bluehost setup):

```
SES_SMTP_HOST=email-smtp.<your-region>.amazonaws.com
SES_SMTP_USER=<the SMTP username from step 5>
SES_SMTP_PASSWORD=<the SMTP password from step 5>
```

`RESEND_API_KEY` can be deleted from both places, or just left blank — the code no
longer reads it either way.

---

## Test checklist

- [ ] Domain identity shows **Verified** in the SES console before testing anything
      downstream.
- [ ] **Production access approved** — check the SES account dashboard confirms
      "not in sandbox" before assuming real client emails will go through. While still
      in sandbox, sends to any address that isn't individually pre-verified will fail
      silently (same "non-fatal, just logged" behavior as before) — this would look
      identical to the current broken state if missed.
- [ ] Register a test client through the receptionist flow and confirm the welcome
      email actually arrives, not just in a spam folder.
- [ ] File a test complaint and confirm the admin alert email arrives.
- [ ] Run the message through a deliverability checker (e.g. mail-tester.com) to
      confirm SPF and DKIM both pass — the whole reason for choosing SES over Bluehost
      for this was deliverability, worth actually confirming it.
- [ ] Confirm the counselor "connect your email" feature and the webmail tab still
      work unaffected — separate code path, but worth a quick sanity check that
      nothing in `lib/email/config.ts` or `/api/email/send` was accidentally touched.
