'use client'

import { motion } from 'framer-motion'
import { LandingDecor } from './LandingDecor'

// ── Layout config ─────────────────────────────────────────────────────────
const LAYOUT = {
  starOpacity: 0.3,
}

// 20 countries — no orange cards (bg is orange)
const CARD_COLORS = [
  'var(--grad-blue)',
  'var(--grad-teal)',
  'var(--grad-green)',
  'linear-gradient(135deg, #cdd94e 0%, #B7C733 100%)',
]

// ISO 3166-1 alpha-2 codes — used to pull real flag images from flagcdn.com
// instead of Unicode flag emoji, which many browsers/fonts (Windows in
// particular) render as blank boxes or letter pairs instead of an actual flag.
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

export function CountriesSection() {
  return (
    <div
      className="bg-texture relative flex h-full flex-col justify-center overflow-hidden px-4 py-10 md:px-10 md:py-24"
      style={{ background: 'var(--grad-orange)' }}
    >

      {/* Decorative layer */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <LandingDecor
          src="/Blue Star.svg" size="star"
          className="right-[8%] top-[12%]"
          style={{ animation: 'star-pulse 3.5s ease-in-out infinite' }}
          opacity={LAYOUT.starOpacity}
        />
        <LandingDecor
          src="/Green star.svg" size="star"
          className="left-[6%] top-[28%]"
          style={{ animation: 'star-pulse 4.8s ease-in-out infinite', animationDelay: '1.2s' }}
          opacity={LAYOUT.starOpacity}
          hideBelowMd
        />
        <LandingDecor
          src="/Blue Star.svg" size="star"
          className="left-[50%] top-[70%]"
          style={{ animation: 'star-pulse 5.5s ease-in-out infinite', animationDelay: '2s' }}
          opacity={LAYOUT.starOpacity}
          hideBelowMd
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-5 text-center md:mb-10"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/70">
            explore the world
          </p>
          <h2 className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold leading-tight text-white">
            Where Do You Want
            <br />
            To Go?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/75 md:mt-5 md:text-base">
            We help Pakistani students reach top universities across 20 countries — from application to visa.
          </p>
        </motion.div>

        {/* Mobile: 5-col compact grid, 60% opacity — all 20 fit on one screen */}
        <div className="grid grid-cols-5 gap-1.5 md:hidden">
          {countries.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.02, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl p-2 text-center"
              style={{ background: CARD_COLORS[i % CARD_COLORS.length], opacity: 0.6 }}
            >
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/25">
                <img
                  src={`https://flagcdn.com/w80/${c.code}.png`}
                  alt={`${c.name} flag`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="text-[9px] font-semibold leading-tight text-white">{c.name}</h3>
            </motion.div>
          ))}
        </div>

        {/* Desktop: 4-col / 5-col grid */}
        <div className="hidden gap-4 md:grid md:grid-cols-4 lg:grid-cols-5">
          {countries.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeInOut' }}
              className="group relative overflow-hidden rounded-card p-5 text-center transition-transform duration-300 hover:-translate-y-1"
              style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
            >
              <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/20">
                <img
                  src={`https://flagcdn.com/w160/${c.code}.png`}
                  alt={`${c.name} flag`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="text-sm font-semibold text-white">{c.name}</h3>
              <p className="mt-0.5 text-xs text-white/70">{c.unis}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
