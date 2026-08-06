# Cursor instructions: theme the scrollbars to match the app's design

## Context

The scrollbar-visibility fix (already live) restored the browser's default
scrollbar everywhere. Default OS scrollbars look out of place against this
app's dark-teal glassmorphism UI. This adds a themed scrollbar instead of the
native gray one, without re-hiding it.

One detail worth knowing before touching this: `html` in this app is always
given `background-color: #0A3F3A` (dark teal) globally — see the existing
comment in `globals.css` above `html { background-color: #0A3F3A; }` — this is
there so the safe-area/notch background never flashes browser-default gray.
That means the actual canvas behind the scrollbar track is dark teal
site-wide, even on the light-mode landing page, since the sections' own
backgrounds only cover their content box, not the outer html canvas. So a
single light/glass-toned scrollbar design works everywhere — no need for a
separate light-mode vs. dark-mode variant.

## The fix

**File:** `src/app/globals.css` — add this block right after the "Minimum
page width" rule (around line 110) and right before the existing
`.scrollbar-hidden` block, so the visual order in the file reads: base sizing
→ themed scrollbar → opt-out class:

```css
/* ── Themed scrollbars — glass-toned thumb instead of the browser default,
   matching the app's glassmorphism palette (same rgba tones as .glass-card)
   with the brand orange on hover. Works everywhere because `html`'s own
   background is always dark teal (see comment above), regardless of which
   page's content sits on top. ──────────────────────────────────────────── */
html {
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent; /* Firefox: thumb, track */
}
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover {
  background-color: rgba(228, 131, 40, 0.65); /* var(--orange), same brand accent used on hover states elsewhere */
}
```

The `border: 2px solid transparent` + `background-clip: padding-box` combo
insets the thumb slightly from the track edges instead of touching them
flush — gives it the same "floating pill" look as the buttons/badges/cards
elsewhere in the app (heavy `rounded-full`/`rounded-xl` usage throughout),
rather than a flat bar.

`.scrollbar-hidden` (already in the file, right after this block) still wins
wherever it's applied — its selectors are more specific
(`.scrollbar-hidden::-webkit-scrollbar { display: none }` beats the bare
`::-webkit-scrollbar` rule above), so nothing that currently opts out of
showing a scrollbar changes.

## Verify

- Any admin/dashboard page with enough content to scroll — scrollbar is a
  thin, translucent white pill instead of the default gray OS scrollbar.
- Hover over the thumb — it tints orange.
- The landing page's snap-scroll sections and anything still using
  `.scrollbar-hidden` are unaffected (still no visible scrollbar there).
- Check on both light and dark parts of the app — the same thumb color reads
  fine in both since it's sitting against the dark teal `html` canvas either
  way, not the page content's own background.
- Firefox: same look via `scrollbar-color` (Firefox doesn't support the
  `::-webkit-scrollbar-*` pseudo-elements, hence both being set).
