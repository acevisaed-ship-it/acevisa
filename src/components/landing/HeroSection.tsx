'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PWAInstallButton } from '@/components/PWAInstallButton'
import { LandingDecor } from './LandingDecor'
import { useNavigateWithTransition } from './ScrollContainer'

const stats = [
  { value: '500+', label: 'students placed' },
  { value: '4', label: 'countries' },
  { value: '9.2 / 10', label: 'satisfaction' },
]

export function HeroSection() {
  const navigate = useNavigateWithTransition()

  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden bg-bg px-5 pb-8 pt-20 md:px-12 lg:px-16">

      {/* ── Animated background layer ───────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        {/* Subtle teal gradient wash */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 65% 50%, rgba(32,131,185,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 70% at 10% 80%, rgba(10,63,58,0.06) 0%, transparent 60%)',
          }}
        />

        <LandingDecor
          src="/Earth.svg"
          size="globe"
          className="right-[-1%] top-[6%]"
          style={{ animation: 'globe-spin 28s linear infinite', transformOrigin: 'center center' }}
          opacity={0.18}
        />

        <LandingDecor
          src="/Globe on stand.svg"
          size="globe-sm"
          className="bottom-[5%] left-[1%]"
          style={{ animation: 'float-bob 6s ease-in-out infinite' }}
          opacity={0.12}
          hideBelowMd
        />

        <LandingDecor
          src="/plane aerieal top view.svg"
          size="plane"
          className="left-0 top-[18%]"
          style={{ animation: 'plane-fly-r 14s linear infinite', animationDelay: '1s' }}
          opacity={0.35}
        />

        <LandingDecor
          src="/plane aerieal top view.svg"
          size="plane"
          className="right-0 top-[55%]"
          style={{ animation: 'plane-fly-l 18s linear infinite', animationDelay: '7s' }}
          opacity={0.3}
          hideBelowMd
        />

        <LandingDecor
          src="/paper airplane.svg"
          size="accent"
          className="left-0 top-[35%]"
          style={{ animation: 'paper-plane-arc 20s ease-in-out infinite', animationDelay: '3s' }}
          opacity={0.25}
        />

        <LandingDecor
          src="/paper airplane.svg"
          size="accent"
          className="right-0 top-[65%]"
          style={{ animation: 'paper-plane-arc2 24s ease-in-out infinite', animationDelay: '10s' }}
          opacity={0.2}
          hideBelowMd
        />

        <LandingDecor
          src="/cloud.svg"
          size="cloud"
          className="left-0 top-[8%]"
          style={{ animation: 'cloud-drift 30s linear infinite' }}
          opacity={0.75}
        />

        <LandingDecor
          src="/cloud.svg"
          size="cloud"
          className="left-0 top-[42%]"
          style={{ animation: 'cloud-drift-slow 38s linear infinite', animationDelay: '12s' }}
          opacity={0.55}
          hideBelowMd
        />

        <LandingDecor
          src="/cloud.svg"
          size="cloud"
          className="left-0 top-[75%]"
          style={{ animation: 'cloud-drift 46s linear infinite', animationDelay: '22s' }}
          opacity={0.65}
        />

        <LandingDecor
          src="/Orange Star.svg"
          size="star"
          className="left-[8%] top-[22%]"
          style={{ animation: 'star-pulse 3.5s ease-in-out infinite', animationDelay: '0.5s' }}
          opacity={0.5}
        />

        <LandingDecor
          src="/Blue Star.svg"
          size="star"
          className="right-[12%] top-[48%]"
          style={{ animation: 'star-pulse 4.2s ease-in-out infinite', animationDelay: '1.8s' }}
          opacity={0.5}
          hideBelowMd
        />

        <LandingDecor
          src="/Green star.svg"
          size="star"
          className="bottom-[18%] right-[20%]"
          style={{ animation: 'star-pulse 5s ease-in-out infinite', animationDelay: '3s' }}
          opacity={0.45}
        />
      </div>
      {/* ── /Animated background ─────────────────────────────────── */}

      {/* Content */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="flex flex-col gap-5"
        >
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-10 w-auto" />

          <p className="text-xs font-medium uppercase tracking-widest text-orange md:text-sm">
            pakistan&apos;s smartest study abroad platform
          </p>

          <h1 className="text-[clamp(2rem,8vw,4.5rem)] font-semibold leading-[0.95] tracking-tight text-blue lowercase">
            your future
            <br />
            is up there
          </h1>

          <p className="max-w-md text-sm text-text/70 md:text-base">
            AI-powered guidance. Real counselors. Real results.
          </p>

          <div>
            <Button
              onClick={() => navigate(1)}
              className="mt-2 px-8 py-4 text-base"
            >
              start your journey →
            </Button>
            <p className="mt-4">
              <Link
                href="/return"
                className="text-sm text-text underline-offset-2 hover:underline"
              >
                Already registered? → Return to your session
              </Link>
            </p>
            <PWAInstallButton className="mt-3 inline-flex items-center gap-2 rounded-full border border-text/20 px-4 py-2 text-sm font-medium text-text/70 hover:border-text/40 hover:text-text transition-colors" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeInOut' }}
          className="flex w-full justify-center lg:justify-end"
        >
          <Card variant="glass" className="w-full max-w-sm space-y-6 p-6 sm:p-8">
            {stats.map((stat) => (
              <div key={stat.label} className="border-b border-text/10 pb-4 last:border-0 last:pb-0">
                <p className="text-2xl font-semibold text-blue md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-text/70 lowercase">
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
