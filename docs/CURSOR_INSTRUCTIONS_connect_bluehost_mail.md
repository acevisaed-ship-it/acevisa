# Cursor instructions: route aceyourvisa.com mail through Bluehost

Goal: create real mailboxes on Bluehost for aceyourvisa.com and make mail actually
reach them, **without disturbing the website DNS**. Per
`CURSOR_INSTRUCTIONS_connect_domain_aceyourvisa.md`, GoDaddy is the authoritative DNS
host for aceyourvisa.com, and the root `A` record + `www` `CNAME` already point to the
Vercel deployment. Bluehost is not the DNS host here — it's only providing mailboxes —
so nothing about domain routing to Vercel changes. Only `MX` (and possibly one `A`
record for a `mail.` subdomain) get added.

## Before Cursor can run anything — logins only the account owner can do

1. **Bluehost cPanel:** log into the Bluehost account, open cPanel. Confirm
   `aceyourvisa.com` is attached to this hosting account (Domains section — if it's not
   the primary domain on the plan, add it as an Addon Domain first). Email Accounts
   can't be created for a domain cPanel doesn't know about.
2. **cPanel API token:** in cPanel → **Security** → **Manage API Tokens** → Create.
   Name it something like `mail-provisioning`, copy the token immediately (shown once).
   Also note the cPanel login username and the domain used to reach cPanel (usually
   `https://aceyourvisa.com:2083` once step 1 above is done, otherwise the server
   hostname shown on the Bluehost dashboard, e.g. `boxNNNN.bluehost.com:2083`).
   ```bash
   export CPANEL_HOST="aceyourvisa.com:2083"   # or the box hostname if domain isn't live there yet
   export CPANEL_USER="your-cpanel-username"
   export CPANEL_TOKEN="the-token-shown-once"
   ```
3. **GoDaddy API key:** reuse the Production key/secret generated in the domain-connect
   task if it's still valid (https://developer.godaddy.com/keys). Generate a new one if
   needed. Same rule as before: export as local env vars, never commit, never paste into
   chat.
   ```bash
   export GODADDY_KEY="your-key-here"
   export GODADDY_SECRET="your-secret-here"
   ```

Same rule as the GoDaddy key: these are credentials — export as local env vars, never
commit, never paste into chat with any AI tool including this one.

---

## 1. Create the mailbox via cPanel UAPI

```bash
curl -s "https://${CPANEL_HOST}/execute/Email/add_pop" \
  -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
  --data-urlencode "email=hashaam" \
  --data-urlencode "domain=aceyourvisa.com" \
  --data-urlencode "password=SET_A_STRONG_PASSWORD_HERE" \
  --data-urlencode "quota=1024"
```

Repeat per mailbox, changing `email=` and the password each time. A JSON response with
`"status": 1` means it was created. Set real passwords per person, not a shared one —
this is the only place a plaintext password appears, and it should go straight into
each person's own password manager, not into a doc or chat log.

To double check what already exists before creating duplicates:
```bash
curl -s "https://${CPANEL_HOST}/execute/Email/list_pops" \
  -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}"
```

## 2. Get the DNS values Bluehost needs GoDaddy to point at

```bash
curl -s "https://${CPANEL_HOST}/execute/Email/get_mx" \
  -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
  --data-urlencode "domain=aceyourvisa.com"
```

This returns the real MX host + priority for this account — don't assume a generic
`mail.aceyourvisa.com` value. If the returned MX host doesn't already resolve on its
own (i.e., it's a bare subdomain that only exists once GoDaddy has an `A` record for
it), also get the Bluehost shared server IP:

```bash
curl -s "https://${CPANEL_HOST}/execute/StatsBar/get_stat?display=serverinformation" \
  -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}"
```

(or read it off the Bluehost dashboard's hosting details panel if that endpoint's
output is unclear). Don't guess these values from documentation — Bluehost assigns
them per-account, same caution as the Vercel IPs in the domain-connect task.

## 3. Update GoDaddy DNS via API

Only two record types change. Everything currently serving the website (root `A` →
Vercel, `www` `CNAME` → Vercel) and unrelated existing records (`NS`, `bounces.cloud.em`
/`bounces.cloud2.em`, `_domainkey`, `_domainconnect`, `SOA`) stay untouched.

```bash
# Replace BLUEHOST_MX_HOST and PRIORITY with the values from cPanel's MX Entry page
curl -X PUT "https://api.godaddy.com/v1/domains/aceyourvisa.com/records/MX/@" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"BLUEHOST_MX_HOST.\", \"priority\": PRIORITY, \"ttl\": 3600}]"
```

Only if step 2 required a separate `mail.` subdomain `A` record (skip if the MX host
already resolves on its own):

```bash
# Replace BLUEHOST_SERVER_IP with the shared server IP from cPanel/Bluehost dashboard
curl -X PUT "https://api.godaddy.com/v1/domains/aceyourvisa.com/records/A/mail" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"BLUEHOST_SERVER_IP\", \"ttl\": 3600}]"
```

Note the trailing dot on the MX `data` value (GoDaddy expects an FQDN there, same as
the CNAME in the domain-connect task). A `200` with empty body means it took; a `4xx`
names the exact field that's wrong in its error body.

## 4. Deliverability — SPF at minimum

Without an SPF record, mail sent from these mailboxes is far more likely to land in
spam. Add one (or extend an existing `TXT` record at `@` if one's already there —
check first, don't overwrite):

```bash
curl -X PUT "https://api.godaddy.com/v1/domains/aceyourvisa.com/records/TXT/@" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"v=spf1 include:bluehost.com ~all\", \"ttl\": 3600}]"
```

Bluehost's cPanel (**Email** → **Authentication**) also offers one-click DKIM setup —
turn it on there; it manages its own DNS record automatically if Bluehost is the DNS
host, but since GoDaddy is authoritative here, check whether cPanel shows a DKIM `TXT`
record to add manually and mirror it into GoDaddy the same way as the MX record above.

## 5. Verify

```bash
dig MX aceyourvisa.com +short
dig TXT aceyourvisa.com +short
```

Re-check every few minutes until the MX record resolves to the Bluehost host — DNS
propagation is usually minutes, occasionally longer. Once it resolves, send a test
email from an outside address (Gmail, etc.) to the new mailbox and confirm it arrives,
then reply from Bluehost's webmail and confirm the outside address receives it without
landing in spam.

---

## Reminder

Infra/DNS + mailbox provisioning only — nothing here touches the `acevisa` repo or
needs a commit/deploy. The website continues to be served by Vercel exactly as set up
in the domain-connect task; this only adds a mail path alongside it.
