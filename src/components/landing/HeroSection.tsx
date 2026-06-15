'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PWAInstallButton } from '@/components/PWAInstallButton'
import { useNavigateWithTransition } from './ScrollContainer'
import { HeroAnimations } from './HeroAnimations'

const stats = [
  { value: '500+', label: 'Students Placed' },
  { value: '4',    label: 'Countries' },
  { value: '9.2 / 10', label: 'Satisfaction' },
]

export function HeroSection() {
  const navigate = useNavigateWithTransition()

  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden bg-bg px-5 pb-8 pt-24 md:px-12 lg:px-16">

      {/* Animated background — all elements live here */}
      <HeroAnimations />

      {/* Man pointing to ACE — bottom-left, fills the blue box area */}
      <div
        className="pointer-events-none absolute bottom-0 z-[6]"
        aria-hidden="true"
        style={{ left: '-4%' }}
      >
        <img
          src="/man pointing to ace.svg"
          alt=""
          className="w-auto"
          style={{ height: 'clamp(360px, 56vh, 640px)' }}
        />
      </div>

      {/* UI Content — centred but weighted right; pr keeps it clear of the globe */}
      <div className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pr-[8%]">

        {/* Content column — logo, text, CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="flex flex-col gap-5"
        >
          <img
            src="/Hero Page LOGO.svg"
            alt="ACE Altius Consulting"
            className="w-full max-w-[420px] h-auto"
          />

          <p className="text-sm font-bold uppercase tracking-widest text-orange md:text-base">
            Pakistan&apos;s First AI Consultancy Platform
          </p>

          <h1 className="text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.95] tracking-tight text-blue">
            Ace Your
            <br />
            Future Here
          </h1>

          <p className="max-w-sm text-base text-text/70 md:text-lg">
            AI-Powered Guidance. Real Counselors. Real Results.
          </p>

          <div>
            <Button
              onClick={() => navigate(1)}
              className="mt-2 px-10 py-5 text-lg font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #E48328 0%, #2083B9 100%)',
                border: 'none',
              }}
            >
              Start Your Journey →
            </Button>

            <p className="mt-4">
              <Link
                href="/return"
                className="inline-block text-sm text-text underline-offset-2 transition-all duration-200 hover:underline hover:scale-105 md:text-base"
              >
                Already Registered? → Return To Your Session
              </Link>
            </p>

            <PWAInstallButton className="mt-3 inline-flex items-center gap-2 rounded-full border border-text/20 px-4 py-2 text-sm font-medium text-text/70 transition-colors hover:border-text/40 hover:text-text md:text-base" />
          </div>
        </motion.div>

        {/* Stats card column */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeInOut' }}
          className="flex w-full justify-center lg:justify-end"
        >
          <Card variant="glass" className="w-full max-w-sm space-y-6 p-6 sm:p-8">
            {stats.map((stat) => (
              <div key={stat.label} className="border-b border-text/10 pb-4 last:border-0 last:pb-0">
                <p className="text-4xl font-semibold text-blue md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-base text-text/70 md:text-lg">
                  {stat.label}
                </p>
              </div>
            ))}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
