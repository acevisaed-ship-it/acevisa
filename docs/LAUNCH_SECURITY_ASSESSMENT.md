# AceVisa Launch Security Assessment & Token Reset Guide

**Date:** 2026-08-02  
**Scope:** Pre-launch credential hygiene, API tokens, DNS/mail, app secrets, operational checklist  
**Audience:** Founders / ops — keep this file; update checkboxes as you rotate keys  
**Rule:** Never paste live secrets into chat, tickets, or commits. Store only in `.env.local` (local) and Vercel Environment Variables (production).

---

## Executive summary

| Priority | Finding | Action |
|----------|---------|--------|
| **P0 — do today** | GoDaddy PAT was pasted in chat | Revoke + create new PAT |
| **P0 — do today** | Local `.env.local` secrets were loaded into AI/tool context | Rotate Anthropic, Supabase service role, Bluehost mailbox password |
| **P0 — before launch** | Production env must use **new** keys only (never reuse exposed ones) | Update Vercel env after rotation |
| **P1** | Mailbox passwords stored as plaintext `app_password` in DB | Accept short-term; plan encryption or vault later |
| **P1** | Many API routes use service-role client (bypasses RLS) | Auth is app-layer — audit any route missing session checks |
| **P2** | Resend / Twilio empty | Fill only if launch needs transactional SMS/email |
| **P2** | GoDaddy Email product may re-add MX | Cancel product if still active |

---

## 1. Credential inventory

### 1.1 Application / hosting (must be in Vercel Production + Preview as needed)

| Variable | Where used | Public? | Rotate before launch? |
|----------|------------|---------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Yes (URL only) | No (unless project moved) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + middleware | Yes (by design; RLS must protect data) | **Yes if exposed in chat/logs** |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — full DB bypass | **Never public** | **Yes — P0** |
| `ANTHROPIC_API_KEY` | AI chat / profiles | Secret | **Yes — P0** |
| `OPENAI_API_KEY` | Voice transcription (`transcribeAudio`) | Secret | Rotate if set / used |
| `RESEND_API_KEY` | Transactional email (`lib/email.ts`) | Secret | Create if launching notifications |
| `TWILIO_ACCOUNT_SID` | SMS | Secret | Create if launching SMS |
| `TWILIO_AUTH_TOKEN` | SMS | Secret | Create if launching SMS |
| `TWILIO_PHONE_NUMBER` | SMS | Semi-public | Set with Twilio |
| `EMAIL_HOST` / `EMAIL_PORT` | IMAP (shared admin mailbox) | Config | No |
| `EMAIL_SMTP_HOST` / `EMAIL_SMTP_PORT` | SMTP | Config | No |
| `EMAIL_USER` / `EMAIL_FROM` | Mail identity | Semi-public | No |
| `EMAIL_PASSWORD` | Shared mailbox password | **Secret** | **Yes — P0** |
| `COMPANY_NAME` | Branding | Public | No |
| `NEXT_PUBLIC_BASE_URL` | Links / redirects | Public | Confirm production URL |

### 1.2 Infra / DNS (local ops only — do **not** put in Vercel unless automating DNS)

| Credential | Purpose | Rotate before launch? |
|------------|---------|------------------------|
| `GODADDY_PAT` (Bearer `gd_pat_…`) | DNS API (domains + DNS scopes) | **Yes — P0 (pasted in chat)** |
| Legacy `GODADDY_KEY` / `GODADDY_SECRET` | Old sso-key style | Revoke if unused |
| `CPANEL_USER` / `CPANEL_TOKEN` / `CPANEL_HOST` | Bluehost mailbox provisioning API | Create only if automating; rotate if ever shared |
| Bluehost / cPanel login password | Hosting control | Strong unique password + 2FA |
| GoDaddy account login | Domain DNS | Strong unique password + 2FA |
| Vercel account / team | Deploy | 2FA; OIDC tokens are short-lived |

### 1.3 Database-stored secrets

| Store | Contents | Risk |
|-------|----------|------|
| `counselor_email_accounts.app_password` | Per-counselor IMAP/SMTP password | Plaintext in DB; API correctly avoids returning it to client on GET |
| Supabase Auth passwords | Staff + student logins | Managed by Supabase; enforce strong passwords |

### 1.4 Safe to be public

- `NEXT_PUBLIC_*` vars (still don’t commit real project keys to git if avoidable)
- Website DNS A/CNAME targets
- MX hostnames (not passwords)
- Brand / company name

---

## 2. Must-reset list (this launch window)

Treat anything that appeared in Cursor chat, screenshots, or shared terminals as **compromised**.

### P0 — reset now (checklist)

Copy this section into your password manager notes and tick as done.

- [ ] **GoDaddy PAT** — Developer dashboard → revoke `cursor` / any `gd_pat_…` used in chat → create new PAT with minimum scopes (`domains.domain:read`, `domains.dns:update` only unless you need more) → store only in local password manager / `.env.local` as `GODADDY_PAT=`
- [ ] **Anthropic API key** — console.anthropic.com → revoke old → create new → update `.env.local` + **Vercel Production**
- [ ] **Supabase `service_role` key** — Supabase project → Settings → API → reset/rotate service_role → update `.env.local` + **Vercel** (downtime risk: redeploy immediately after)
- [ ] **Supabase `anon` key** — rotate if it was dumped with env file; update `.env.local` + Vercel + any mobile/clients
- [ ] **Bluehost `admin@aceyourvisa.com` password** — cPanel Email Accounts → change password → update `EMAIL_PASSWORD` in `.env.local` + Vercel + any counselor_email_accounts rows using it
- [ ] **Confirm `.env*` is gitignored** — `acevisa/.gitignore` already has `.env*`; never force-add env files
- [ ] **Vercel env audit** — Production / Preview / Development: remove stale keys; no secrets in “Build logs” screenshots

### P1 — reset or harden soon

- [ ] All staff Bluehost mailbox passwords (unique per person; never shared admin password)
- [ ] Supabase dashboard login + enable MFA
- [ ] GoDaddy account MFA
- [ ] Bluehost account MFA
- [ ] Vercel account MFA
- [ ] GitHub / repo access MFA; review collaborator list
- [ ] Cancel unused **GoDaddy Email / Microsoft 365** product so MX cannot be force-reinstated (`sable_mx`)

### P2 — create when feature ships

- [ ] Resend (or SES) API / SMTP for app notifications
- [ ] Twilio if SMS is in go-live scope
- [ ] OpenAI key if voice transcription is in go-live scope
- [ ] DKIM TXT for Bluehost mail at GoDaddy (deliverability)

---

## 3. How to rotate (quick recipes)

### GoDaddy PAT
1. https://developer.godaddy.com → Personal Access Tokens  
2. Revoke exposed token  
3. Create new with **Domains & DNS** scopes only as needed  
4. Save once: `GODADDY_PAT=gd_pat_...` in local env (not Vercel unless you automate DNS)

### Anthropic
1. Anthropic Console → API Keys → Delete old  
2. Create new → paste into Vercel + `.env.local`  
3. Redeploy

### Supabase service_role / anon
1. Supabase → Project Settings → API  
2. Rotate JWT secret / regenerate keys per Supabase UI  
3. Update Vercel env **before** or **immediately with** redeploy  
4. Smoke-test login + one admin API + one counselor API

### Bluehost mailbox
1. cPanel → Email Accounts → Manage → Change Password  
2. Update `EMAIL_PASSWORD` and any `counselor_email_accounts.app_password`  
3. Test IMAP inbox + SMTP send from app

---

## 4. Where secrets live (source of truth)

| Environment | Location | Notes |
|-------------|----------|-------|
| Local dev | `acevisa/.env.local` | Gitignored; never commit |
| Production | Vercel → Project → Settings → Environment Variables | Production + Preview separately |
| DNS ops | Local only / password manager | `GODADDY_PAT`, cPanel token |
| Staff mail | Bluehost + optional DB row | One mailbox per person |

**Do not store production secrets in:**
- Git commits / PRs  
- Cursor chat  
- Slack / WhatsApp  
- `docs/` instruction files  
- Screenshots of dashboards showing full keys  

---

## 5. Application security posture (launch-relevant)

### What’s in good shape
- Page routes `/dashboard`, `/admin`, `/receptionist` gated by middleware (session + role + active status)
- Admin/receptionist helpers (`requireAdminApi`, `requireReceptionistApi`) used on many admin APIs
- Email config GET does not return `app_password` to the client
- `.env*` ignored by git in `acevisa/.gitignore`
- Remember-me / session cookie handling for staff login

### Risks to accept or fix before scale

1. **Service-role heavy architecture**  
   Server uses `SUPABASE_SERVICE_ROLE_KEY` widely; RLS is not the primary gate for staff APIs.  
   **Launch requirement:** every `/api/**` route that mutates or reads PII must check session + role.  
   **Follow-up:** periodic audit of new routes; prefer user-scoped clients where possible.

2. **Middleware does not wrap `/api/*`**  
   Auth is per-route. A missing check = open endpoint.  
   **Launch requirement:** spot-check new routes; keep QA checklist for auth.

3. **Mailbox passwords in Postgres plaintext**  
   Acceptable for small team launch if DB access is locked down; encrypt at rest plan post-launch.

4. **Transactional email / SMS not configured**  
   Welcome/notification emails may silently skip when `RESEND_API_KEY` empty — confirm product expectation at launch.

5. **Mail DNS**  
   Domain mail must stay on Bluehost MX (`mail.aceyourvisa.com` → hosting IP). Re-verify after any GoDaddy “email product” changes.

---

## 6. Pre-launch security checklist (printable)

### Accounts & access
- [ ] MFA on GoDaddy, Bluehost, Supabase, Vercel, GitHub, Anthropic
- [ ] No shared “company” passwords for personal logins
- [ ] Offboard unused collaborator accounts
- [ ] CEO/admin/counselor/receptionist test accounts use unique passwords

### Secrets
- [ ] All P0 rotations done (section 2)
- [ ] Vercel Production env matches new secrets
- [ ] Local `.env.local` matches (or intentionally differs for dev project)
- [ ] No secrets in git history (`git log` / secret scanning if available)
- [ ] GoDaddy PAT revoked after DNS work (or locked in password manager only)

### Mail
- [ ] MX → `mail.aceyourvisa.com` only (no `secureserver.net`)
- [ ] SPF includes Bluehost (`websitewelcome.com` or current Bluehost include)
- [ ] DKIM published
- [ ] Email Routing = Local in cPanel
- [ ] Test send + receive for `admin@` and each staff mailbox
- [ ] Portal inbox/send works with updated password

### App
- [ ] Login / role redirect works for admin, counselor, receptionist
- [ ] Inactive counselor cannot access dashboard
- [ ] Student auth flows work (set-password, login)
- [ ] File upload / document download requires auth
- [ ] AI routes require authenticated staff/student as designed
- [ ] `NEXT_PUBLIC_BASE_URL` is production domain

### Data
- [ ] Supabase backups / PITR reviewed
- [ ] Storage buckets not public unless intentional
- [ ] Confirm RLS on sensitive tables for anon key (defense in depth)

---

## 7. After launch — recurring hygiene

| Cadence | Action |
|---------|--------|
| Immediate after any paste/leak | Rotate that credential |
| Quarterly | Rotate Anthropic, service_role, mailbox app passwords |
| On staff exit | Disable Supabase user + Bluehost mailbox + revoke email-config row |
| After DNS changes | Re-check MX / SPF / DKIM |
| Every new API route | Auth + role check before merge |

---

## 8. Incident quick response

If a key leaks again:

1. **Revoke first**, then replace (don’t only add a new key and leave the old one)  
2. Update Vercel + redeploy  
3. Update `.env.local` for all developers  
4. For mailbox password: change cPanel password + DB `app_password`  
5. For Supabase service_role: assume DB was fully accessible — review Auth users, recent rows, storage  
6. Note date + what leaked in this file’s changelog below  

### Changelog

| Date | Event | Action taken |
|------|-------|--------------|
| 2026-08-02 | GoDaddy PAT pasted in Cursor chat; `.env.local` loaded in session | **Pending:** revoke PAT; rotate Anthropic, Supabase keys, `admin@` password; update Vercel |
| 2026-08-02 | DNS switched to Bluehost mail via GoDaddy API | Keep monitoring MX; cancel GoDaddy email product if it returns |

---

## 9. Copy-paste: blank env template (no secrets)

Keep `.env.example` aligned. Production values go only in Vercel / local private files.

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
COMPANY_NAME=AceVisa
NEXT_PUBLIC_BASE_URL=https://aceyourvisa.com

EMAIL_HOST=box2422.bluehost.com
EMAIL_PORT=993
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
EMAIL_SMTP_HOST=box2422.bluehost.com
EMAIL_SMTP_PORT=465

# Local DNS ops only — do not deploy to Vercel unless automating DNS
GODADDY_PAT=
```

---

## 10. Owner sign-off

| Role | Name | Date | Confirms P0 rotations + MFA |
|------|------|------|-----------------------------|
| Technical owner | | | [ ] |
| Business owner | | | [ ] |

**File location:** `acevisa/docs/LAUNCH_SECURITY_ASSESSMENT.md`  
**Use:** Re-open this before every major go-live or after any credential exposure.
