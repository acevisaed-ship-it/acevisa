# Cursor instructions: create + connect a mailbox per counselor

Repeatable steps for giving every counselor their own real mailbox (rather than
everyone sharing `admin@aceyourvisa.com`), covering both a one-off manual path and a
scripted bulk path — pick whichever fits how many people need this at once.

**Real account list, confirmed:**

| Role | Email | Mailbox status |
|------|-------|-----------------|
| CEO / Super Admin | `ceo@aceyourvisa.com` | Needs creating |
| Counselor | `aneeqa@aceyourvisa.com` | Needs creating |
| Counselor | `arooj@aceyourvisa.com` | Needs creating |
| Counselor | `osama@aceyourvisa.com` | Needs creating |
| Counselor | `marrium@aceyourvisa.com` | Needs creating |
| Admin (Branch Manager) | `admin@aceyourvisa.com` | **Already exists** — skip creating |
| Receptionist | `fd@aceyourvisa.com` | Needs creating |

**Important gap found while preparing this:** the "Connect email account" feature
(`CounselorEmailConfig`) only appears on `/admin/counselors`, and that page only
lists accounts with `role = 'counselor'` (`getCounselorsWithCounts.ts` hardcodes
`.eq('role', 'counselor')`). So the mailbox-creation steps below work for all 7
accounts, but **only the 4 counselor accounts can actually be connected through the
existing UI today** — `ceo@`, `admin@`, and `fd@` have no equivalent "connect my
email" screen anywhere in the app yet, for any role. Those three will keep falling
back to the shared `EMAIL_HOST`/`EMAIL_USER` env vars regardless of whether their
mailbox exists. Extending that UI to CEO/Admin/Receptionist is a separate small
feature — flagging it here rather than silently leaving `ceo@` and `fd@` mailboxes
created but never actually usable in the portal. Say the word and I'll spec that
extension.

---

## Option A — manual, one at a time (fine for a handful of people)

Per counselor, in Bluehost cPanel:

1. **Email** → **Email Accounts** → **Create**.
2. Username: their `localPart` (e.g. `sara`) — domain is already `aceyourvisa.com`.
3. Set a password (or let cPanel generate one — copy it immediately, shown once).
4. Save.

Host/port settings are the same for every mailbox on this account — no need to look
them up again per person, they're the same values used for `admin@aceyourvisa.com`:
- IMAP: `box2422.bluehost.com`, port `993`
- SMTP: `box2422.bluehost.com`, port `465`

Then connect it in the portal — `/admin/counselors` → find that counselor's card →
**Connect email account** → fill in the new address, those host/port values, and the
password → **Save email config**. Repeat per counselor.

---

## Option B — scripted, create several mailboxes in one pass

Same cPanel UAPI token approach used for the earlier Bluehost mail setup (`Security` →
**Manage API Tokens** → reuse the existing token if it's still valid, or create a new
one). Same env vars as before:
```bash
export CPANEL_HOST="aceyourvisa.com:2083"
export CPANEL_USER="your-cpanel-username"
export CPANEL_TOKEN="the-token-shown-once"
```

```bash
#!/bin/bash
# create-counselor-mailboxes.sh
# Creates one mailbox per entry below and prints the generated password once.
# Fill in the real names/local-parts before running.

COUNSELORS=(
  "Sara Khan:sara"
  "Ali Raza:ali"
  "Zainab Butt:zainab"
)

for entry in "${COUNSELORS[@]}"; do
  NAME="${entry%%:*}"
  LOCAL="${entry##*:}"
  PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c16)

  echo "Creating ${LOCAL}@aceyourvisa.com for ${NAME}..."
  curl -s "https://${CPANEL_HOST}/execute/Email/add_pop" \
    -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
    --data-urlencode "email=${LOCAL}" \
    --data-urlencode "domain=aceyourvisa.com" \
    --data-urlencode "password=${PASSWORD}" \
    --data-urlencode "quota=1024" | grep -o '"status":[01]'

  echo "  ${NAME} — ${LOCAL}@aceyourvisa.com — password: ${PASSWORD}"
  echo "---"
done
```

Run it (`bash create-counselor-mailboxes.sh`), and it prints each mailbox's address +
generated password once as it goes — copy that output somewhere safe immediately
(a password manager, not a chat log or plain file), since like the manual path,
there's no way to retrieve these passwords again afterward, only reset them.

Verify what got created before moving on:
```bash
curl -s "https://${CPANEL_HOST}/execute/Email/list_pops" \
  -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}"
```

## Connecting each one in the portal

Same step regardless of which option created the mailboxes — `/admin/counselors` →
each counselor's card → **Connect email account**:
- Email address: `{localPart}@aceyourvisa.com`
- IMAP host/port: `box2422.bluehost.com` / `993`
- SMTP host/port: `box2422.bluehost.com` / `465`
- Password: whichever was generated/set for that mailbox

Repeat per counselor. Once done, each person's `/dashboard/email` tab shows their own
inbox instead of falling back to `admin@aceyourvisa.com`.

---

## Test checklist

- [ ] `Email::list_pops` (or cPanel's Email Accounts list) shows one mailbox per
      counselor, correct addresses
- [ ] Each counselor's `/admin/counselors` card shows "Email connected —
      {their address}", not admin@'s
- [ ] Each counselor's own `/dashboard/email` shows their own inbox, sending works
- [ ] A test email sent to `sara@aceyourvisa.com` does NOT show up in anyone else's
      connected inbox
