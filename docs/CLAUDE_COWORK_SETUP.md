# Reconnect Claude Cowork to ACE Visa

Use this after reinstalling Claude Desktop. Cowork projects live only on this computer; they are not in git. The files in the repo are what survive.

## Exact folder to attach

```
E:\GIT\Portal\acevisa
```

That directory **is** the Next.js app (package.json, `src\`, `supabase\`). Do **not** pick `E:\GIT\Portal`. Do **not** pick `Documents` or a new empty Cowork folder.

## Claude Desktop (Cowork)

1. Open Claude Desktop.
2. Switch the mode picker to **Cowork**.
3. Optional first-run: type `/setup-cowork`.
4. Left sidebar → **Projects** → **+**.
5. Choose **Use an existing folder**.
6. Browse to `E:\GIT\Portal\acevisa` → Open → **Allow** file access.
7. Name: `ACE Visa Portal`
8. Description: `Next.js 16 visa consultancy portal for ACE Altius Consulting. Admin, counselor, student, receptionist. Production https://acevisa.vercel.app.`
9. Paste the standing instructions below into the project instructions field.
10. Add links: `https://acevisa.vercel.app`
11. Start a session **inside this project** (select it in the sidebar). Confirm Claude can list `src\app` and `CLAUDE.md`.

If the UI says **Work in a folder** instead of Projects, pick the same path: `E:\GIT\Portal\acevisa`.

## Standing instructions (paste into the Cowork project)

```
You are working on the ACE Visa portal at E:\GIT\Portal\acevisa.

This folder is the git repo and the Next.js 16 app. Stay inside it. Do not create a parallel copy elsewhere.

Read CLAUDE.md and .cursorrules before editing. Next.js 16 has breaking changes — read node_modules/next/dist/docs/ before writing Next.js APIs.

Users: Admin (/admin), Counselor (/dashboard), Student (/portal, /student), Receptionist (/receptionist). Production: https://acevisa.vercel.app.

Commands from this folder: npm run dev, npm run lint, npx tsc --noEmit.

Supabase project qefhuepmjbtmijgoguca. Save SQL under supabase/ and run: supabase db execute --file ./supabase/<file>.sql. Never ask me to paste SQL in the dashboard. Never expose SUPABASE_SERVICE_ROLE_KEY.

Do not use localStorage. Do not delete activity_logs. Use Tailwind tokens (bg, text, green, orange, blue), not raw hex.
```

## Claude Code (terminal in Cursor or Windows Terminal)

```powershell
cd E:\GIT\Portal\acevisa
claude
```

In the session, run `/context` and confirm **Memory files** includes `CLAUDE.md`. If it is missing, you are in the wrong directory.

## What Claude should read first

| File | Why |
|---|---|
| `CLAUDE.md` | Paths, layout, commands, hard rules |
| `.cursorrules` | Auth, design system, API and component conventions |
| `AGENTS.md` | Next.js 16 warning |
| `.cursor/rules/supabase-sql.mdc` | Apply SQL via CLI |
| `src/middleware.ts` | Session / remember-me |
| `src/lib/supabase/server.ts` | Server auth helpers |

## If Cowork still looks empty

- Reinstall does not clone the repo. The code stays at `E:\GIT\Portal\acevisa`; only the Cowork project metadata was lost.
- Grant folder permission again if Windows or Claude prompts.
- Do not use **Start from scratch** (that creates a new empty folder). Always **Use an existing folder**.
