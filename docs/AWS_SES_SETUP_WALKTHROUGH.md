# AWS SES setup walkthrough — aceyourvisa.com

This is a checklist for you to work through in the AWS console yourself — signing
in, domain verification, and the production access request all require your AWS
account, so I can't drive this part directly. I'll draft the text you need and
tell you exactly what to click at each stage.

Region: **us-east-1 (N. Virginia)** — matches what's already hardcoded as the
default in `lib/email.ts` (`email-smtp.us-east-1.amazonaws.com`), and it's the
cheapest/most broadly supported region. Stick with this unless you have a reason
not to.

---

## Step 1 — Verify the domain

1. Sign in to the AWS Console → search for **SES** (Simple Email Service) →
   make sure the region selector (top right) says **US East (N. Virginia)**.
2. Left nav → **Verified identities** → **Create identity**.
3. Identity type: **Domain**. Domain: `aceyourvisa.com`.
4. Turn on **Easy DKIM** (leave it on the default RSA_2048_BIT setting).
5. Click **Create identity**. AWS will show you a set of DNS records — usually
   3 CNAME records for DKIM, plus (if you enable it) a DMARC/SPF-related TXT
   record.
6. Add each of those exact records to your DNS at GoDaddy (Domains → DNS →
   Add Record). Copy the host/value pairs AWS shows you exactly — don't
   retype them by hand if you can copy-paste, CNAME values are long and easy to
   typo.
7. Verification usually completes within a few minutes to a few hours after the
   DNS records propagate (AWS says up to 72h, in practice it's normally much
   faster). The identity's status in the SES console flips from "Pending" to
   "Verified" — refresh that page to check.

**Tell me once you've added the records and I'll help sanity-check the DNS is
propagating correctly if you want** (I can look up the DNS records publicly to
confirm they resolve, without needing any access to your AWS or GoDaddy account).

---

## Step 2 — Request production access

Your account starts in "sandbox mode" — it can only send to email addresses
you've individually verified, which is useless for real client traffic. You need
to request production access before this is usable.

1. In the SES console, left nav → **Account dashboard**. You'll see "Your
   account is in the sandbox" with a **Request production access** button.
2. Fill out the form. Here's drafted text for the fields that ask for
   free-text justification — adjust anything that doesn't sound like you:

   **Use case description:**
   > ACE Altius Consulting operates an education-consultancy client portal
   > (aceyourvisa.com) built on Next.js/Supabase. We send transactional email
   > only: account-creation notices for new staff/client accounts, password
   > resets, and welcome/confirmation emails when a client is registered by our
   > office staff. All recipients are individuals who have directly engaged
   > with our consultancy (registered as a client or created a staff account) —
   > no purchased lists, no cold outreach. We expect moderate but growing
   > volume as our marketing drives more signups.

   **How do you plan to interact with your recipients?**
   > All emails are transactional, triggered by a specific user action (account
   > creation, password reset request, client registration). Recipients are
   > existing clients or staff of our consultancy.

   **How do you handle bounces and complaints?**
   > We rely on SES's built-in bounce and complaint handling. We will monitor
   > the SES reputation dashboard and remove/flag addresses that hard-bounce or
   > complain. [If you set up an SNS topic or bounce webhook — mention that
   > here; if not yet, say "we plan to configure SES event publishing to
   > monitor bounce/complaint rates" instead — that satisfies the requirement
   > without needing it done before submitting.]

   **Additional contact addresses for bounce/complaint notifications:** use
   `ceo@aceyourvisa.com` or `admin@aceyourvisa.com`.

3. Submit. AWS Support typically responds within 24–48 hours. You'll get an
   email when it's approved (or if they ask follow-up questions — sometimes
   they do, just answer plainly).

---

## Step 3 — Create SMTP credentials (after production access is approved)

1. SES console → left nav → **SMTP settings**.
2. Note the **SMTP endpoint** shown there — should be
   `email-smtp.us-east-1.amazonaws.com`, matching the code default.
3. Click **Create SMTP credentials** — this opens an IAM user creation screen.
   Give it a name like `ses-smtp-aceyourvisa`.
4. Click **Create user** — AWS shows you a **SMTP username** and **SMTP
   password** exactly once, with a **Download credentials** button. Download
   that CSV and store it somewhere safe (password manager) — AWS will not show
   the password again.

---

## Step 4 — Get the credentials into the app

I'm not going to type the actual SMTP username/password into any file myself —
that's a hard line I hold regardless of who's asking, same as every other
credential in this project. Two ways to get them in:

**Either** add them yourself directly to `.env.local`:
```
SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SES_SMTP_USER=<the SMTP username AWS gave you>
SES_SMTP_PASSWORD=<the SMTP password AWS gave you>
```
and the same three under Vercel → Project Settings → Environment Variables →
Production (and Preview, if you want `dev`'s preview deploy to send real email
too).

**Or** hand the downloaded credentials CSV to Cursor and have it add the env
vars for you, in both places — Cursor already has the file/Vercel access from
the rest of this work.

---

## After this is done

Once `SES_SMTP_*` is set in both places and the domain shows "Verified" in SES:
- Register a test client through the receptionist flow → confirmation email
  should actually arrive now.
- Test a counselor account-creation / password-reset email too, though those
  already worked via Supabase's own email system, unrelated to this change.
