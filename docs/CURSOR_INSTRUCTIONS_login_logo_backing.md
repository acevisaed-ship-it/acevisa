# Cursor instructions: white glassmorphic backing behind the logo on login pages

## Problem

`src/app/(counselor)/login/page.tsx` renders the logo bare, directly on the
dark teal `glass-card-blue` card:

```tsx
<div className="mb-8 flex flex-col items-center gap-2">
  <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
</div>
```

Every other place the logo appears against a dark surface — `AdminSidebar.tsx`,
the mobile headers in `AdminShell.tsx`/`DashboardShell.tsx` — wraps it in a
white rounded square first:

```tsx
<div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5">
  <img src="/logo.png" alt="ACE Altius Consulting" className="h-9 w-auto" />
</div>
```

The counselor login page never got that treatment.

## Fix

**File:** `src/app/(counselor)/login/page.tsx`, replace:

```tsx
<div className="mb-8 flex flex-col items-center gap-2">
  <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
</div>
```

with:

```tsx
<div className="mb-8 flex flex-col items-center gap-2">
  <div className="inline-flex items-center justify-center rounded-2xl bg-white/95 px-5 py-4 crisp">
    <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
  </div>
</div>
```

Sized up from the sidebar version (`rounded-2xl px-5 py-4` vs. `rounded-xl
px-2.5 py-1.5`) since this is a large hero logo, not a small header logo. The
`crisp` utility class (already defined in `globals.css`) adds the same subtle
inset-outline treatment used elsewhere on light surfaces sitting on dark
backgrounds — matches the app's existing "crisp outline" design language
rather than introducing a new border style.

## Also worth doing while in there

`src/app/(student)/portal/login/page.tsx` has the identical issue (same bare
logo on the same `glass-card-blue` card, lines ~78-81) — same fix applies
there if you want visual parity across both login screens:

```tsx
<div className="mb-8 flex justify-center">
  <div className="inline-flex items-center justify-center rounded-2xl bg-white/95 px-4 py-3 crisp">
    <img src="/logo.png" alt="ACE Altius Consulting" className="h-14 w-auto" />
  </div>
</div>
```

(Sized slightly smaller — `px-4 py-3` / `h-14` — to match that page's existing
smaller logo size.)

## Verify

- `/login` (counselor portal) — logo now sits on a white rounded square,
  clearly legible against the dark card, matching the sidebar's logo
  treatment.
- If the student portal page is also updated: `/portal/login` shows the same
  fix.
- Nothing else on either page shifts — this only wraps the existing `<img>`,
  doesn't change layout elsewhere.
