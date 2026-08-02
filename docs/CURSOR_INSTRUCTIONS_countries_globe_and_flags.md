# Cursor instructions: Countries section globe + real flag images

Follow-up to `CURSOR_INSTRUCTIONS_landing_globe_and_unpublished_sections.md` (already
merged — commit `c482d18`, confirmed on `origin/main`). Two more things on the
Countries section (page 7), found from a fresh screenshot:

1. Same flat spinning globe issue as Registration had — this section has its own
   separate copy of the same `/Earth.svg` + CSS-spin pattern, never covered by the
   original fix since only page 5 was reported at the time.
2. The country circles show literal letters ("GB", "CA", "IE"...) instead of flags.
   **Not a missing-code bug** — the source already has real flag emoji (🇬🇧, 🇨🇦, etc.)
   in the `countries` array. This is flag emoji rendering as fallback text on
   Windows/fonts that lack flag-glyph support — a known cross-platform emoji
   limitation, not something a redeploy fixes. Real flag images fix it everywhere,
   permanently.

---

## 1. Globe — same fix as Registration, different position/size

**File:** `src/components/landing/CountriesSection.tsx`

Add the import:
```ts
import { useState, useEffect } from 'react'
import { EarthSphere } from './EarthSphere'
```

Add the same resize-aware wrapper pattern used in `RegistrationSection.tsx`, sized for
this section's original footprint:
```tsx
// ── Corner globe — same 3D EarthSphere as Hero/Registration ──
function CountriesGlobe() {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const update = () => {
      // Mirrors the clamp(220px, 22vw, 420px) this replaces
      setSize(Math.min(420, Math.max(220, Math.round(window.innerWidth * 0.22))))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (!size) return null
  return <EarthSphere size={size} />
}
```

Replace:
```tsx
<LandingDecor
  src="/Earth.svg"
  hideBelowLg
  opacity={1}
  style={{
    width: 'clamp(220px, 22vw, 420px)',
    bottom: '-5%',
    right: '-3%',
    animation: 'globe-spin 30s linear infinite',
  }}
/>
```
with:
```tsx
<div className="pointer-events-none absolute hidden lg:block" style={{ bottom: '-5%', right: '-3%' }}>
  <CountriesGlobe />
</div>
```
(`hidden lg:block` matches the original `hideBelowLg` behavior)

---

## 2. Real flag images instead of emoji

**File:** `src/components/landing/CountriesSection.tsx`

Replace the `flag` emoji field with a lowercase ISO 3166-1 alpha-2 `code` field in the
`countries` array:

```ts
const countries = [
  { code: 'gb', name: 'United Kingdom',  unis: '130+ Universities' },
  { code: 'ca', name: 'Canada',           unis: '100+ Universities' },
  { code: 'ie', name: 'Ireland',          unis: '40+ Universities'  },
  { code: 'nz', name: 'New Zealand',      unis: '25+ Universities'  },
  { code: 'us', name: 'USA',              unis: '200+ Universities' },
  { code: 'au', name: 'Australia',        unis: '90+ Universities'  },
  { code: 'my', name: 'Malaysia',         unis: '30+ Universities'  },
  { code: 'cn', name: 'China',            unis: '50+ Universities'  },
  { code: 'by', name: 'Belarus',          unis: '15+ Universities'  },
  { code: 'cy', name: 'Cyprus',           unis: '10+ Universities'  },
  { code: 'hu', name: 'Hungary',          unis: '20+ Universities'  },
  { code: 'at', name: 'Austria',          unis: '20+ Universities'  },
  { code: 'lv', name: 'Latvia',           unis: '12+ Universities'  },
  { code: 'lt', name: 'Lithuania',        unis: '12+ Universities'  },
  { code: 'ro', name: 'Romania',          unis: '18+ Universities'  },
  { code: 'ch', name: 'Switzerland',      unis: '15+ Universities'  },
  { code: 'it', name: 'Italy',            unis: '35+ Universities'  },
  { code: 'be', name: 'Belgium',          unis: '18+ Universities'  },
  { code: 'se', name: 'Sweden',           unis: '22+ Universities'  },
  { code: 'de', name: 'Germany',          unis: '60+ Universities'  },
]
```

Using [flagcdn.com](https://flagcdn.com) — a free, no-signup, no-API-key CDN of flag
images by ISO code, no new npm dependency or local asset files needed.

In the **mobile grid** (5-col), replace:
```tsx
<div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/25 text-lg">
  {c.flag}
</div>
```
with:
```tsx
<div className="mx-auto mb-1 h-7 w-7 overflow-hidden rounded-full bg-white/25">
  <img src={`https://flagcdn.com/w80/${c.code}.png`} alt={`${c.name} flag`} className="h-full w-full object-cover" loading="lazy" />
</div>
```

In the **desktop grid**, replace:
```tsx
<div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/20 text-3xl">
  {c.flag}
</div>
```
with:
```tsx
<div className="mx-auto mb-2.5 h-12 w-12 overflow-hidden rounded-full bg-white/20">
  <img src={`https://flagcdn.com/w160/${c.code}.png`} alt={`${c.name} flag`} className="h-full w-full object-cover" loading="lazy" />
</div>
```
(`w160` for the larger desktop circle so the image doesn't look soft when scaled up —
flagcdn serves fixed-width PNGs at several sizes; `w80`/`w160` match roughly to the
7-and-12 circle sizes here)

---

## Test checklist

- [ ] Countries section shows the same rotating 3D globe as Hero/Registration, not
      the flat spinning image
- [ ] Every one of the 20 circles shows an actual flag image, not letters — test in
      a Windows browser specifically, since that's where the emoji fallback was
      showing up
- [ ] Flags load correctly on both the mobile 5-col grid and desktop grid layouts
- [ ] No console errors if `flagcdn.com` is briefly slow/unreachable — the `alt` text
      still identifies the country even if an image fails to load
- [ ] Re-verify the Registration page globe once this is deployed — confirm both
      pages now show the 3D globe consistently, closing out the original request
