@AGENTS.md

# ACE Visa Portal — Claude / Cowork

AI-powered visa and overseas education consultancy portal for **ACE Altius Consulting** (Pakistan). Three user types: Admin, Counselors, Students/Clients.

- **Production:** https://acevisa.vercel.app
- **Repo root (attach this folder only):** `E:\GIT\Portal\acevisa`
- **Do not attach** `E:\GIT\Portal` (parent). This directory **is** the app. Do not `cd acevisa`.

Full coding rules live in `.cursorrules`. Follow those plus this file.

---

## After reinstalling Claude

1. Open **Claude Desktop** → **Cowork**.
2. **Projects** → **+** → **Use an existing folder**.
3. Select `E:\GIT\Portal\acevisa` and allow file access.
4. Name: `ACE Visa Portal`. Description: `Next.js 16 visa consultancy portal (admin / counselor / student).`
5. Paste the standing instructions from `docs/CLAUDE_COWORK_SETUP.md`.
6. Links to add: `https://acevisa.vercel.app` and this GitHub repo.
7. For Claude Code CLI: `cd E:\GIT\Portal\acevisa` then `claude`. Confirm with `/context` that `CLAUDE.md` loaded.

---

## Directory map

```
E:\GIT\Portal\acevisa\                 ← working directory / Cowork folder
├── CLAUDE.md                          this file
├── CLAUDE.local.md                    machine paths (gitignored)
├── .cursorrules                       coding, auth, design, API rules
├── AGENTS.md                          Next.js 16 breaking-change notice
├── src\
│   ├── app\
│   │   ├── (public)\                  landing, login, reset-password, schedule, chat
│   │   ├── (counselor)\               /login, /dashboard/**
│   │   ├── (admin)\                   /admin/**
│   │   ├── (student)\                 /portal/**, /student/**
│   │   ├── receptionist\              /receptionist
│   │   └── api\                       Next.js Route Handlers
│   ├── components\                    admin, dashboard, chat, brief, landing, team, receptionist, student, ui
│   ├── lib\                           supabase, auth, email, admin, dashboard helpers
│   ├── middleware.ts                  session + remember-me enforcement
│   └── types\                         shared TypeScript types
├── supabase\                          schema.sql + migrations (apply via CLI)
├── docs\                              task briefs; Cowork reconnect steps
├── public\                            logo, PWA (manifest.json, sw.js)
└── qa\                                QA checklists
```

Imports use `@/` → `src/`. Pages: `page.tsx`. Layouts: `layout.tsx`. Components: PascalCase named exports. Utils: camelCase.

---

## Commands (from repo root)

```bash
npm run dev          # http://localhost:3000
npm run build
npm run lint
npx tsc --noEmit
```

Supabase project ref: `qefhuepmjbtmijgoguca`. Apply SQL from this root — never ask the user to paste SQL in the dashboard:

```bash
supabase db execute --file ./supabase/<filename>.sql
supabase db execute "SELECT * FROM clients LIMIT 5"
```

---

## Stack

Next.js 16 App Router (read `node_modules/next/dist/docs/` before writing Next.js code), TypeScript strict, Supabase PostgreSQL + Auth (`@supabase/ssr`), Tailwind CSS v4 design tokens, `lucide-react`, Vercel.

Route groups use layouts for auth. Never skip the layout check.

---

## Auth (do not bypass)

Server: `getAuthenticatedCounselor()`, `requireAdmin()` from `@/lib/supabase/server`.  
Client: `createClient()` from `@/lib/supabase/client`.  
DB in server components / API routes: `createAdminClient()` (service role — server only).

Cookies: `ace_remember` (`0`|`1`) and `ace_session_token` (session-only when remember is off). Middleware (`src/middleware.ts`) clears auth if remember is off and the session cookie is missing.

Sign-out: `clearAceSessionCookies()` then `supabase.auth.signOut()`. Never `localStorage` / `sessionStorage`. Never `getSession()` for auth checks — use `getUser()` or the helpers.

---

## Design tokens (never raw hex)

`bg` `#E6E8E7` · `text` `#0A3F3A` · `green` `#B7C733` · `orange` `#E48328` · `blue` `#2083B9`

Logo on dark backgrounds (`bg-text`) must sit in a white container. Icons on dark headers: `text-white`. Touch targets: `min-h-[44px] min-w-[44px]`. Cards: `rounded-[20px]` / `rounded-card`. Buttons: `rounded-full` or `rounded-xl`.

---

## Never do

- Expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Delete `activity_logs` rows
- Add sidebar nav as raw JSX — use the `navItems` array
- `router.push` after auth changes without `router.refresh()`
- Cache `/api/*` in the service worker
