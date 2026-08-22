---
paths:
  - "supabase/**"
  - "src/lib/supabase/**"
  - "src/app/api/**"
---

# Supabase on this repo

Working directory is `E:\GIT\Portal\acevisa` (this repo). Do not `cd acevisa`.

- Linked project: `qefhuepmjbtmijgoguca`
- Server/API DB: `createAdminClient()` from `@/lib/supabase/server`
- Browser mutations: `createClient()` from `@/lib/supabase/client`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Never delete `activity_logs` rows

Save SQL under `supabase/` or `supabase/migrations/`, then:

```bash
supabase db execute --file ./supabase/<filename>.sql
```
