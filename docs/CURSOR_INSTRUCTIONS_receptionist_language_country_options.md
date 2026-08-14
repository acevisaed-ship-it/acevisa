# Receptionist registration form — language test sub-options + full Schengen country list

Scope: `src/components/receptionist/ReceptionistRegisterForm.tsx`, its API route
`src/app/api/receptionist/register-client/route.ts`, and a small `clients` table
migration. Both `interested_in` and `target_country` are already plain `text`
columns with no DB-level enum constraint (confirmed by reading the current
insert in `register-client/route.ts`), so most of this is UI + one new column.

## 1. Language test sub-selection

When `interested_in === 'Language & Test Prep'`, show an additional required
select for which test the client is interested in:

```
IELTS
PTE
Duolingo
TOEFL
LanguageCert
Oxford ELLT
Other
```

If "Other" is selected, reveal a small text input beneath it to capture the
actual test name — otherwise that information is lost. Store whatever value
ends up selected (preset or custom) as plain text; no need for two columns.

Note this is a *lead-classification* field captured at registration, separate
from the existing `products` table (`supabase/migrations/20260620000005_language_test_products.sql`),
which models actual sellable IELTS/PTE course packages with pricing and
commission structure. Don't try to merge these two — the receptionist form
field is just "what is this person interested in," not a product selection.

**Migration** (new file, e.g. `2026XXXX_client_language_test_interest.sql`):
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS language_test_interest text;
```

**Form state**: add `language_test_interest: string` to `FormState` in
`ReceptionistRegisterForm.tsx`, default `''`. Render the new select only when
`form.interested_in === 'Language & Test Prep'`. Reset it to `''` when the
user switches `interested_in` away from that option, so a stale value doesn't
get submitted for an unrelated service.

**API route**: accept `language_test_interest` in the request body, insert it
into the `clients` row (`language_test_interest: language_test_interest?.trim() || null`).

## 2. Country dropdown — full Schengen list + Other

The current `targetCountries` array in `ReceptionistRegisterForm.tsx` mixes
non-Schengen destinations with a partial, somewhat inaccurate Schengen subset
(it's missing most members, and incorrectly implies Cyprus and Belarus belong
to Schengen — neither does; Cyprus is EU but not Schengen, Belarus is neither).
Replace it with two clearly separated, accurate groups plus an "Other" catch-all.

**Non-Schengen destinations (keep as-is, these are real existing routes):**
```
United Kingdom, Canada, Australia, Ireland, New Zealand, USA, Malaysia, China, Cyprus
```
(Cyprus moved here since it isn't actually Schengen, but is a real ACE study
route per earlier discussion — don't drop it, just stop mislabeling it.)

**Schengen countries (all 29 members, confirmed current as of this session —
verify against an official source at implementation time in case membership
changes again):**
```
Austria, Belgium, Bulgaria, Croatia, Czechia, Denmark, Estonia, Finland,
France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Liechtenstein,
Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania,
Slovakia, Slovenia, Spain, Sweden, Switzerland
```

**Other:** add as a final option. When selected, reveal a text input (same
pattern as the language-test "Other") so the receptionist can type the actual
country. Store whatever ends up chosen/typed directly in `target_country`
(already a free-text column — no schema change needed here).

**UI structure**: use `<optgroup>` inside the existing native `<select>` to
group "Popular Destinations" vs. "Schengen Countries" vs. "Other" — keeps this
a simple select rather than needing a new component, consistent with the rest
of the form.

## 3. Verification

- Selecting "Language & Test Prep" reveals the test-type select; selecting
  anything else hides it and clears any previously chosen value.
- Selecting "Other" under either language test or country reveals a text
  input, and that typed value is what actually gets saved (check the client
  record after submitting).
- Switching away from "Other" back to a preset value doesn't leave stale
  custom text saved.
- Confirm the new `language_test_interest` column shows up wherever the
  client's other intake fields are visible (client profile, CRM row) — if it
  doesn't currently render anywhere, that's fine for this task, just don't
  let it silently disappear if there's a "client details" summary view that
  lists every field.
- Existing clients registered before this change should not break — the new
  column is nullable and additive only.

Out of scope for this task, flagged for later if wanted: the admin/CEO
client-edit and CRM forms may have their own copies of a similar
country/service dropdown — this task only touches the receptionist
registration form specifically, per what was asked.
