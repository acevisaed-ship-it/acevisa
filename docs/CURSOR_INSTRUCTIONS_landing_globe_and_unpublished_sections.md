# Cursor instructions: landing page globe consistency + hiding unpublished sections

## Page numbering — confirm before applying

The landing page (`acevisa.vercel.app`) is one scroll-snap page built from 11 stacked
sections, listed in `src/components/landing/LandingPage.tsx` with a `SECTION_COUNT =
11` constant in `src/lib/stores/scrollStore.ts`. Counting each section as "page N"
(1-indexed, matching first-to-last scroll order):

| Page | Section component | Currently |
|---|---|---|
| 1 | HeroSection | published |
| 2 | AboutSection | published |
| 3 | ServicesSection | published |
| 4 | AIChatSection | published |
| 5 | RegistrationSection | published |
| 6 | GallerySection | published |
| 7 | CountriesSection | published |
| 8 | BlogsSection | published |
| 9 | EventsSection | published |
| 10 | ScholarshipsSection | published |
| 11 | BecomeAPartnerSection | published |

Only 11 sections exist today — there's no page 12 in the code yet, so that one isn't
covered below. This mapping is inferred from code order, not confirmed against the
live site (I couldn't reach the browser from here) — but it lines up exactly with the
bug report: page 1 (Hero) and page 5 (Registration) do use two different globe
implementations, confirmed in code below. If pages 6/8/9/10/11 don't match what you
see live, the fix pattern in §2 still applies — just adjust which `published: false`
flags get set.

---

## 1. Globe consistency — Registration section uses a different globe than Hero

**Confirmed in code:** `HeroSection.tsx` renders the real 3D globe —
`<EarthSphere size={...} />`, a Three.js rotating Earth (`src/components/landing/
EarthSphere.tsx`, texture `/Earth2.png`). `RegistrationSection.tsx` renders something
different — a flat static image, CSS-spun:

```tsx
{/* Earth globe — top-right */}
<LandingDecor
  src="/Earth.svg"
  hideBelowMd
  opacity={1}
  style={{ width: LAYOUT.earth.width, top: LAYOUT.earth.top, right: LAYOUT.earth.right, animation: 'globe-spin 22s linear infinite' }}
  initial={{ opacity: 0, y: -10 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.7, delay: 0.7 }}
/>
```

**Fix — file:** `src/components/landing/RegistrationSection.tsx`

Add the import:
```ts
import { EarthSphere } from './EarthSphere'
```

Add a small resize-aware wrapper above the component (same pattern
`HeroSection.tsx` already uses for its own globe — reuse it rather than inventing a
new one):
```tsx
// ── Corner globe — same 3D EarthSphere as Hero, sized for this corner slot ──
function RegistrationGlobe() {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const update = () => {
      // Mirrors the LAYOUT.earth clamp(180px, 20vw, 380px) this replaces
      setSize(Math.min(380, Math.max(180, Math.round(window.innerWidth * 0.2))))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (!size) return null
  return <EarthSphere size={size} />
}
```
(`useState`/`useEffect` are already imported at the top of this file)

Replace the `<LandingDecor src="/Earth.svg" .../>` block shown above with:
```tsx
{/* Earth globe — top-right — same EarthSphere 3D globe as Hero */}
<motion.div
  className="pointer-events-none absolute hidden md:block"
  style={{ top: LAYOUT.earth.top, right: LAYOUT.earth.right }}
  initial={{ opacity: 0, y: -10 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.7, delay: 0.7 }}
>
  <RegistrationGlobe />
</motion.div>
```

This drops the `LandingDecor` wrapper for this one element (it was only ever an `<img>`
wrapper, and `EarthSphere` is a canvas, not an image) but keeps the same position,
fade-in-on-scroll behavior, and mobile-hidden behavior (`hideBelowMd` → `hidden
md:block`). `/Earth.svg` and the `globe-spin` CSS animation become unused by this file
— leave them alone, don't delete the asset or the CSS keyframe in case something else
references them (quick check: `grep -r "Earth.svg\|globe-spin"` before removing
anything, not required for this fix to work).

---

## 2. Hiding pages 6, 8, 9, 10, 11 without deleting them

**Goal:** keep the components fully built and in the codebase, just don't render them
on the live site yet, and make turning one back on later a one-line change.

**File:** `src/components/landing/LandingPage.tsx`

Replace the whole file with:

```tsx
'use client'

import { LandingNav } from './LandingNav'
import { ScrollContainer } from './ScrollContainer'
import { HeroSection } from './HeroSection'
import { AboutSection } from './AboutSection'
import { ServicesSection } from './ServicesSection'
import { AIChatSection } from './AIChatSection'
import { RegistrationSection } from './RegistrationSection'
import { GallerySection } from './GallerySection'
import { CountriesSection } from './CountriesSection'
import { BlogsSection } from './BlogsSection'
import { EventsSection } from './EventsSection'
import { ScholarshipsSection } from './ScholarshipsSection'
import { BecomeAPartnerSection } from './BecomeAPartnerSection'

// `published: false` = built and kept in the codebase, just not shown on the live
// site yet. Flip back to `true` and redeploy whenever it's ready to go live —
// no need to touch imports or re-wire anything else.
const SECTIONS: { id: string; Component: React.ComponentType; published: boolean }[] = [
  { id: 'hero',         Component: HeroSection,           published: true },
  { id: 'about',        Component: AboutSection,          published: true },
  { id: 'services',     Component: ServicesSection,       published: true },
  { id: 'ai-chat',      Component: AIChatSection,         published: true },
  { id: 'register',     Component: RegistrationSection,   published: true },
  { id: 'gallery',      Component: GallerySection,        published: false }, // page 6 — hold for later
  { id: 'countries',    Component: CountriesSection,      published: true },
  { id: 'blogs',        Component: BlogsSection,          published: false }, // page 8 — hold for later
  { id: 'events',       Component: EventsSection,         published: false }, // page 9 — hold for later
  { id: 'scholarships', Component: ScholarshipsSection,   published: false }, // page 10 — hold for later
  { id: 'partner',      Component: BecomeAPartnerSection, published: false }, // page 11 — hold for later
]

export function LandingPage() {
  const visible = SECTIONS.filter((s) => s.published)

  return (
    <>
      <LandingNav />
      <ScrollContainer>
        {visible.map(({ id, Component }) => <Component key={id} />)}
      </ScrollContainer>
    </>
  )
}
```

**Important — this alone isn't enough.** `ScrollContainer.tsx` currently clamps
scroll/swipe/keyboard navigation using a hardcoded `SECTION_COUNT = 11` imported from
`scrollStore.ts`, not the actual number of sections it received. If you hide 5
sections without also fixing this, scrolling past the last *visible* section (now
Countries, 6th of 6) would still try to scroll to index 10 and land on blank space —
the dot indicator and swipe/keyboard nav would be out of sync with what's actually
rendered.

**File:** `src/components/landing/ScrollContainer.tsx`

Remove the `SECTION_COUNT` import:
```ts
import { useScrollStore } from '@/lib/stores/scrollStore'   // was: SECTION_COUNT, useScrollStore
```

Change `getSections` to not slice against the constant (cap at a generous safety
number instead, unrelated to publish state):
```ts
function getSections(children: ReactNode) {
  return Children.toArray(children).filter(isValidElement).slice(0, 30)
}
```

Inside the component, derive the count from what was actually rendered instead of the
constant:
```ts
export function ScrollContainer({ children }: ScrollContainerProps) {
  const sections = getSections(children)
  const sectionCount = sections.length   // NEW — replaces every use of SECTION_COUNT below
  ...
```

Update the one other usage:
```ts
const goToSection = useCallback((index: number) => {
  if (cooldownRef.current) return
  const clamped = Math.max(0, Math.min(sectionCount - 1, index))
  useScrollStore.setState({ currentSection: clamped })
  cooldownRef.current = true
  setTimeout(() => { cooldownRef.current = false }, SNAP_COOLDOWN)
}, [sectionCount])
```

This makes the scroll container permanently self-sizing — no more hardcoded section
count to remember to update every time a page gets published or unpublished, this
time or in the future. `scrollStore.ts`'s exported `SECTION_COUNT` constant is now
unused (nothing else in the codebase references it, per a full-repo search) — safe to
delete that line, or leave it as dead code if you'd rather not touch that file at all.

---

## Test checklist

- [ ] Confirm live section order matches the table in this doc before applying —
      scroll through `acevisa.vercel.app` top to bottom once and count
- [ ] Registration section's globe is now the same rotating 3D Earth as the Hero
      section, not the flat spinning image
- [ ] Only 6 sections are reachable after hiding: Hero, About, Services, AI Chat,
      Registration, Countries — scrolling/swiping/arrow-keys past Countries does
      **not** reveal blank space or skip content
- [ ] The right-edge dot indicator shows exactly 6 dots, not 11
- [ ] Gallery/Blogs/Events/Scholarships/Become-a-Partner components still exist in
      the codebase untouched — this was a visibility toggle, not a deletion
- [ ] Flipping one `published: false` back to `true` and redeploying brings that page
      back with no other changes needed
