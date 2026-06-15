'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DollarSign, Globe, GraduationCap } from 'lucide-react'
import { LandingDecor } from './LandingDecor'

const scholarships = [
  {
    name: 'Chevening Scholarship',
    country: '🇬🇧 United Kingdom',
    value: 'Fully Funded',
    deadline: 'November 2026',
    description: 'UK government scholarship covering tuition, living costs & travel for outstanding leaders.',
    color: 'var(--grad-blue)',
  },
  {
    name: 'Commonwealth Scholarship',
    country: '🌍 Commonwealth Countries',
    value: 'Fully Funded',
    deadline: 'December 2026',
    description: 'For students from Commonwealth nations to study at top UK universities.',
    color: 'var(--grad-teal)',
  },
  {
    name: 'Erasmus+ Scholarship',
    country: '🇪🇺 Europe',
    value: 'Up to €12,000/yr',
    deadline: 'February 2027',
    description: 'EU-funded program supporting Pakistani students studying across European institutions.',
    color: 'var(--grad-green)',
  },
  {
    name: 'HEC Overseas Scholarship',
    country: '🇵🇰 Pakistan (HEC)',
    value: 'Fully Funded',
    deadline: 'July 2026',
    description: 'Pakistan\'s premier scholarship for postgraduate and PhD studies abroad.',
    color: 'var(--grad-orange)',
  },
]

export function ScholarshipsSection() {
  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden bg-bg px-5 py-10 md:px-10 md:py-24">

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <LandingDecor
          src="/Orange Star.svg" size="star"
          className="right-[10%] top-[10%]"
          style={{ animation: 'star-pulse 3.8s ease-in-out infinite' }}
          opacity={0.25}
        />
        <LandingDecor
          src="/Green star.svg" size="star"
          className="left-[5%] top-[55%]"
          style={{ animation: 'star-pulse 5s ease-in-out infinite', animationDelay: '1.5s' }}
          opacity={0.25}
          hideBelowMd
        />
        <LandingDecor
          src="/Graduation Cap.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: 'clamp(200px, 20vw, 380px)',
            top: '5%',
            left: '-2%',
            animation: 'float-bob 8s ease-in-out infinite',
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
            fund your future
          </p>
          <h2 className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold leading-tight text-blue">
            Scholarships You
            <br />
            Can Actually Win
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-text/70 md:mt-5 md:text-base">
            We guide you through the most competitive scholarships — from statement writing to interview prep.
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          {scholarships.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.09, ease: 'easeInOut' }}
            >
              <Card
                variant="dark"
                className="flex h-full flex-col gap-3 p-5"
                style={{ background: s.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {s.value}
                  </span>
                  <span className="text-xs text-white/60">Due {s.deadline}</span>
                </div>
                <h3 className="text-sm font-semibold text-white md:text-base">{s.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  {s.country}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-white/75">{s.description}</p>
                <Button className="mt-auto w-full border-white/30 bg-white/15 py-2 text-xs text-white hover:bg-white/25 md:text-sm">
                  Check Eligibility →
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
