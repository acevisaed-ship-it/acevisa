# Cursor instructions: connect aceyourvisa.com to Vercel via CLI

Goal: point `aceyourvisa.com` (currently on GoDaddy's own Website Builder — confirmed
not in active use, safe to replace) at the acevisa Vercel deployment, using each
service's CLI/API instead of clicking through dashboards.

## Before Cursor can run anything — two one-time logins only the account owner can do

Neither of these can be delegated to an agent — they require the human logging into
the actual account:

1. **Vercel:** run `npx vercel login` in the project directory. It opens a browser tab
   for you to approve — complete that once, and the CLI stays authenticated on this
   machine for future commands. If the project isn't already linked, also run `npx
   vercel link` and select the existing `acevisa` project.
2. **GoDaddy:** log into https://developer.godaddy.com/keys, generate a **Production**
   API key + secret for your GoDaddy account. Copy both — GoDaddy only shows the
   secret once.

Store the GoDaddy key/secret as local environment variables, not in any file that gets
committed:
```bash
export GODADDY_KEY="your-key-here"
export GODADDY_SECRET="your-secret-here"
```
Never put these in a `.env` file that isn't git-ignored, and never paste them into
chat with any AI tool, including this one.

---

## 1. Add the domain in Vercel and get the required DNS values

```bash
npx vercel domains add aceyourvisa.com
npx vercel domains add www.aceyourvisa.com
npx vercel domains inspect aceyourvisa.com
```

The `inspect` output includes the exact A record IP and CNAME target for this account
— capture those two values, they're what get written to GoDaddy in the next step.
(Don't hardcode a value from documentation or a search result — Vercel's assigned
values can differ per account/project, and `inspect` always shows the current
correct one.)

## 2. Update the two DNS records at GoDaddy via API

Only two records need to change — the root `A` record (currently pointed at GoDaddy's
own Website Builder product) and the `www` `CNAME` (currently pointed back at the bare
domain, a GoDaddy Website Builder default). Everything else already in that zone (the
two `NS` records, `bounces.cloud.em`/`bounces.cloud2.em` and `_domainkey` CNAMEs,
`_domainconnect`, `SOA`) stays untouched — unrelated to which site the domain serves.

```bash
# Replace VERCEL_A_IP with the value from `vercel domains inspect` above
curl -X PUT "https://api.godaddy.com/v1/domains/aceyourvisa.com/records/A/@" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"VERCEL_A_IP\", \"ttl\": 600}]"

# Replace VERCEL_CNAME_TARGET with the value from `vercel domains inspect` above
curl -X PUT "https://api.godaddy.com/v1/domains/aceyourvisa.com/records/CNAME/www" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"VERCEL_CNAME_TARGET.\", \"ttl\": 600}]"
```

Note the trailing dot on the CNAME's `data` value — GoDaddy's API expects a fully
qualified domain name there, same as it shows in the DNS panel screenshot.

A `200` response with an empty body means the record was accepted. A `4xx` means
something's off — GoDaddy's error body usually names the exact field (commonly `code`
+ `message`) explaining why, so don't guess-retry blindly if you get one.

## 3. Verify

```bash
npx vercel domains inspect aceyourvisa.com
```

Re-run every few minutes until the domain shows as verified/valid — DNS propagation
is usually a few minutes, occasionally up to a few hours. Once verified, Vercel issues
the SSL certificate automatically, no further action needed.

## 4. Canonical domain — pick one

Decide whether `aceyourvisa.com` or `www.aceyourvisa.com` is canonical, then set the
other to redirect to it:
```bash
npx vercel domains add www.aceyourvisa.com --redirect aceyourvisa.com
```
(swap the two if `www` should be canonical instead — default recommendation is the
bare domain as canonical unless there's a reason to prefer `www`)

---

## Reminder

This whole task is DNS/infra configuration, not application code — there's nothing to
commit or deploy here, and none of this touches the `acevisa` repo itself. Once step 3
confirms verified, `aceyourvisa.com` will serve the live Next.js site directly.
