# Cursor instructions: wipe all test data before go-live

## What this is

Every client and counselor account currently in the system — including every CEO,
Admin, and Receptionist login, and all data tied to any of them (chats, documents,
tasks, meetings, complaints, activity logs, notifications, HR/finance records, team
hub chat) — was created during development and testing. Confirmed: none of it is
real; all of it gets removed before go-live.

**Business-config nuance (read this):** some tables *look* counselor-linked but are
really org configuration, not client/counselor operational data:

| Table | Why it looks counselor-linked | What CASCADE actually does |
|-------|-------------------------------|----------------------------|
| `campaigns` | `default_counselor_id` = default assignee for that ad source | No CASCADE — just a nullable FK |
| `products` | Often managed alongside commission setup | **No** counselor FK — catalog is independent |
| `product_commission_rules` | `counselor_id` = who gets that share | `ON DELETE CASCADE` deletes the **rule row**, not the product |
| `commission_policy_rules` / `team_commission_policy` | Org commission templates | Not per-client data |

The wipe script still removes these by default (they were confirmed as throwaway
seed/test config). If you want a clean people wipe but **keep** the product catalog,
campaigns, and commission templates, add `--keep-business-config`.

**Always kept untouched:** `branches`, `hr_policies`, `portal_settings`.  
**Kept, counselor ref cleared:** `knowledge_base.added_by`  
(and `campaigns.default_counselor_id` when using `--keep-business-config`).

**This removes literally every login** — including the account you're using now.
The script's last step recreates exactly one fresh CEO account.

Script: `scripts/wipe-all-test-data.ts`

---

## Before running anything — take a backup

This is irreversible. Supabase dashboard → **Database** → **Backups** — take a
manual backup (or confirm a recent automatic one) before `--confirm`.

Also note: many tables currently have **RLS disabled**. The wipe uses the service
role so it still works; enabling RLS is a separate go-live hardening task (do not
flip RLS on without policies, or the app will break).

## 1. Preview first — always

```bash
cd acevisa
npx tsx --env-file=.env.local scripts/wipe-all-test-data.ts
```

With no flags this **only prints** what would be deleted — every counselor (name,
email, role), every client, and a row count for every dependent table. Nothing is
touched. Review carefully:

- Counselor list matches expectations — no account that suddenly matters?
- Row counts look like test volume?
- Business-config section: are you OK wiping products (14+), campaigns, commission
  rules — or do you want `--keep-business-config`?

Only move on once the preview looks right.

## 2. Run it for real

```bash
# Full wipe including products / campaigns / commission config (default)
npx tsx --env-file=.env.local scripts/wipe-all-test-data.ts --confirm

# OR: wipe people + operational data, keep product catalog / campaigns / commission templates
npx tsx --env-file=.env.local scripts/wipe-all-test-data.ts --keep-business-config --confirm
```

What it does, in order:
1. Captures client Auth IDs + counselor emails **before** deletes.
2. Deletes rows from every selected dependent table (see arrays in the script).
3. Clears counselor FKs on kept rows (`knowledge_base.added_by`, and optionally
   `campaigns.default_counselor_id`).
4. Deletes every `clients` row, then every `counselors` row.
5. Deletes matching Supabase Auth users (DB delete alone leaves credentials alive).
6. Recreates one CEO Auth user + `counselors` row and prints a one-time temp password.

## 3. Your way back in

- Email: `hashaamahmed496@gmail.com` (change `NEW_CEO_EMAIL` / `NEW_CEO_NAME` in the
  script first if you prefer e.g. `admin@aceyourvisa.com`)
- Temp password is printed once to the terminal — copy it immediately and change it
  after login.

If CEO recreate fails, recover via Supabase Auth + a manual `counselors` insert.

---

## Test checklist

- [ ] Preview reviewed; business-config wipe vs keep decided
- [ ] Supabase backup taken / confirmed recent
- [ ] After `--confirm`: old sessions force login
- [ ] Log in with new CEO temp password → change password immediately
- [ ] Team / clients lists empty
- [ ] `branches`, portal settings, HR policies still intact
- [ ] If config was wiped: re-seed products/campaigns as needed before real users
- [ ] Create one test counselor + one test client end-to-end

## Recommendation

Prefer `--keep-business-config` if the seeded Study Visa / IELTS products and ad
campaigns are what you want live staff to start from. Use the default full wipe if
you want a completely blank commercial setup and will reconfigure from scratch.
