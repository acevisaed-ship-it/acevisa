'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BadgeCheck, TrendingUp, Users, Zap } from 'lucide-react'
import { LandingDecor } from './LandingDecor'
import { SectionBeeOrangePlane, SectionGreenPlaneToLogo } from './HeroAnimations'

const benefits = [
  {
    icon: TrendingUp,
    title: 'Earn Commission',
    description: 'Competitive commissions on every successful student placement you refer.',
  },
  {
    icon: Users,
    title: 'Dedicated Support',
    description: 'Your own partner dashboard, real-time case tracking, and a dedicated manager.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Tools',
    description: 'Access our AI counselor for your own clients — white-labeled and ready to deploy.',
  },
  {
    icon: BadgeCheck,
    title: 'Certified Partner',
    description: 'Official ACE Altius partner certificate and co-branded marketing materials.',
  },
]

export function BecomeAPartnerSection() {
  return (
    <div
      className="bg-texture relative flex h-full flex-col justify-center overflow-hidden px-5 py-10 md:px-10 md:py-24"
      style={{ background: 'var(--grad-blue)' }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <LandingDecor
          src="/Orange Star.svg" size="star"
          className="left-[8%] top-[15%]"
          style={{ animation: 'star-pulse 3.5s ease-in-out infinite' }}
          opacity={0.3}
        />
        <LandingDecor
          src="/Green star.svg" size="star"
          className="right-[10%] top-[60%]"
          style={{ animation: 'star-pulse 4.8s ease-in-out infinite', animationDelay: '2s' }}
          opacity={0.3}
          hideBelowMd
        />
        <LandingDecor
          src="/Blue Star.svg" size="star"
          className="left-[45%] top-[8%]"
          style={{ animation: 'star-pulse 5.5s ease-in-out infinite', animationDelay: '1s' }}
          opacity={0.25}
          hideBelowMd
        />
        {/* Orange paper plane — 60fps bee physics (same as Hero BeeOrangePlane) */}
        <SectionBeeOrangePlane />

        {/* Green plane — Framer Motion directed right→left toward ACE logo */}
        <SectionGreenPlaneToLogo />
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
            grow with us
          </p>
          <h2 className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold leading-tight text-white">
            Become an ACE
            <br />
            Altius Partner
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/70 md:mt-5 md:text-base">
            Join Pakistan's fastest-growing education consultancy network. Refer students, earn commissions, and grow your business.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 sm:gap-5 md:mb-10">
          {benefits.map((b, i) => {
            const Icon = b.icon
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeInOut' }}
              >
                <Card
                  variant="dark"
                  className="flex h-full flex-col gap-3 p-5"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <Icon className="h-6 w-6 text-orange" strokeWidth={1.5} />
                  <h3 className="text-sm font-semibold text-white md:text-base">{b.title}</h3>
                  <p className="text-sm leading-relaxed text-white/70">{b.description}</p>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <Button className="px-10 py-4 text-base">
            Apply to Become a Partner →
          </Button>
          <p className="mt-3 text-xs text-white/50">Free to apply · No upfront cost · Response within 48 hours</p>
        </motion.div>
      </div>
    </div>
  )
}
