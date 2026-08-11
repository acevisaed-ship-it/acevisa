# Send email via ACE's own Bluehost mailbox instead of AWS SES/Brevo

## Context

AWS SES production access was requested and rejected (generic review rejection, no specific reason given). Rather than fight AWS's review process or pay for a third-party ESP, the decision is to send transactional email directly through the `noreply@aceyourvisa.com` mailbox already hosted on Bluehost/cPanel, using the same generic SMTP code that's already in place. No third party, no approval process, no cost.

`src/lib/email.ts` already uses plain `nodemailer` with configurable host/user/password via `SES_SMTP_HOST`/`SES_SMTP_USER`/`SES_SMTP_PASSWORD` env vars — those variable names stay as-is regardless of provider, just point them at Bluehost instead of AWS. No SES-specific SDK is involved anywhere, so this is a low-risk swap.

## 1. Make port/TLS mode configurable (small code change)

Currently `port: 587` and `secure: false` are hardcoded in `getTransporter()` — this was fine for AWS SES specifically, but Bluehost/cPanel mail servers sometimes require port 465 with implicit TLS (`secure: true`) instead. Make both configurable with defaults that preserve current behavior, so this works for whichever port Bluehost's mail server actually needs without another code change:

```ts
function getTransporter() {
  if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASSWORD) return null
  const port = Number(process.env.SES_SMTP_PORT ?? 587)
  return nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST ?? 'email-smtp.us-east-1.amazonaws.com',
    port,
    secure: process.env.SES_SMTP_SECURE
      ? process.env.SES_SMTP_SECURE === 'true'
      : port === 465, // implicit TLS on 465, STARTTLS on 587/others
    auth: {
      user: process.env.SES_SMTP_USER,
      pass: process.env.SES_SMTP_PASSWORD,
    },
  })
}
```

This is backward compatible — if `SES_SMTP_PORT`/`SES_SMTP_SECURE` aren't set, behavior is identical to today (port 587, STARTTLS).

## 2. What the account owner needs to do in cPanel (not a code task)

These steps happen in Bluehost/cPanel directly, not in the codebase:

1. Log into cPanel → **Email Accounts**. Confirm whether `noreply@aceyourvisa.com` already exists (there were 8 mailboxes on this account as of earlier setup work — check if this is one of them). If not, create it.
2. Set or reset that mailbox's password. Use a strong, dedicated password — this will be typed directly into env vars, not shared with any other account.
3. In cPanel, next to that mailbox, use **Connect Devices** (or "Configure Mail Client") — this shows the exact outgoing SMTP server hostname and ports Bluehost wants used (may be `mail.aceyourvisa.com`, or a Bluehost-specific box hostname like `box####.bluehost.com` — use exactly what cPanel shows, don't guess). Note both the hostname and which port it recommends (587 or 465) and whether it's labeled SSL/TLS or STARTTLS.

## 3. Env vars

Once the mailbox exists and the SMTP server details are known, set in `.env.local` and Vercel → Project Settings → Environment Variables → Production (and Preview):

```
SES_SMTP_HOST=<exact hostname from cPanel's Connect Devices page>
SES_SMTP_USER=noreply@aceyourvisa.com
SES_SMTP_PASSWORD=<that mailbox's password>
SES_SMTP_PORT=587   (or 465, whichever cPanel recommends)
SES_SMTP_SECURE=false   (true if using port 465)
```

Do not commit real credentials to the repo — env vars only, same rule as every other credential in this project.

## 4. Verification

- Register a test client through the receptionist flow → confirmation email should arrive (check spam folder too, since no SPF/DKIM verification is being done for this domain the way it was for SES — deliverability may be inconsistent, this was an accepted tradeoff).
- Test a password reset email.
- If sends fail with an auth or connection error, double check the exact host/port from cPanel's Connect Devices page — Bluehost mail servers are picky about using the exact hostname shown there rather than a guessed `mail.yourdomain.com`.
