'use client'

import { motion } from 'framer-motion'
import { LandingDecor } from './LandingDecor'

// ── Layout config ─────────────────────────────────────────────────────────
const LAYOUT = {
  starOpacity: 0.25,
}

const countries = [
  { flag: '🇬🇧', name: 'United Kingdom',     unis: '130+ Universities',  color: 'var(--grad-blue)' },
  { flag: '🇨🇦', name: 'Canada',              unis: '100+ Universities',  color: 'var(--grad-teal)' },
  { flag: '🇮🇪', name: 'Ireland',             unis: '40+ Universities',   color: 'var(--grad-green)' },
  { flag: '🇦🇺', name: 'Australia',           unis: '90+ Universities',   color: 'var(--grad-orange)' },
  { flag: '🇩🇪', name: 'Germany',             unis: '60+ Universities',   color: 'var(--grad-blue)' },
  { flag: '🇳🇱', name: 'Netherlands',         unis: '50+ Universities',   color: 'var(--grad-teal)' },
]

export function CountriesSection() {
  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden bg-bg px-5 py-10 md:px-10 md:py-24">

      {/* Decorative layer */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <LandingDecor
          src="/Orange Star.svg" size="star"
          className="right-[8%] top-[12%]"
          style={{ animation: 'star-pulse 3.5s ease-in-out infinite' }}
          opacity={LAYOUT.starOpacity}
        />
        <LandingDecor
          src="/Blue Star.svg" size="star"
          className="left-[6%] top-[28%]"
          style={{ animation: 'star-pulse 4.8s ease-in-out infinite', animationDelay: '1.2s' }}
          opacity={LAYOUT.starOpacity}
          hideBelowMd
        />
        <LandingDecor
          src="/Green star.svg" size="star"
          className="left-[50%] top-[70%]"
          style={{ animation: 'star-pulse 5.5s ease-in-out infinite', animationDelay: '2s' }}
          opacity={LAYOUT.starOpacity}
          hideBelowMd
        />
        <LandingDecor
          src="/Earth.svg"
          hideBelowLg
          opacity={0.08}
          style={{
            width: 'clamp(220px, 22vw, 420px)',
            bottom: '-5%',
            right: '-3%',
            animation: 'globe-spin 30s linear infinite',
          }}
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
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            explore the world
          </p>
          <h2 className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold leading-tight text-blue">
            Where Do You Want
            <br />
            To Go?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-text/70 md:mt-5 md:text-base">
            We help Pakistani students reach top universities across 6 countries — from application to visa.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          {countries.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeInOut' }}
              className="group relative overflow-hidden rounded-card p-5 text-center transition-transform duration-300 hover:-translate-y-1 md:p-7"
              style={{ background: c.color }}
            >
              <div className="mb-3 text-4xl md:text-5xl">{c.flag}</div>
              <h3 className="text-sm font-semibold text-white md:text-base">{c.name}</h3>
              <p className="mt-1 text-xs text-white/70">{c.unis}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
