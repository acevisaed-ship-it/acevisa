'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PWAInstallButton } from '@/components/PWAInstallButton'
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

        {/* Spinning Earth globe — top-right */}
        <div
          style={{
            position: 'absolute',
            top: '6%',
            right: '-2%',
            width: 260,
            height: 260,
            animation: 'globe-spin 28s linear infinite',
            transformOrigin: 'center center',
            opacity: 0.18,
          }}
        >
          <img src="/Earth.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Globe on stand — bottom-left, slower float */}
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '1%',
            width: 130,
            height: 130,
            animation: 'float-bob 6s ease-in-out infinite',
            opacity: 0.12,
          }}
        >
          <img src="/Globe on stand.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Commercial plane — flies left→right at top */}
        <div
          style={{
            position: 'absolute',
            top: '18%',
            left: 0,
            width: 90,
            height: 40,
            animation: 'plane-fly-r 14s linear infinite',
            animationDelay: '1s',
          }}
        >
          <img src="/plane aerieal top view.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Commercial plane — flies right→left mid-height */}
        <div
          style={{
            position: 'absolute',
            top: '55%',
            right: 0,
            width: 75,
            height: 34,
            animation: 'plane-fly-l 18s linear infinite',
            animationDelay: '7s',
          }}
        >
          <img src="/plane aerieal top view.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Paper plane — diagonal arc */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            width: 52,
            height: 40,
            animation: 'paper-plane-arc 20s ease-in-out infinite',
            animationDelay: '3s',
          }}
        >
          <img src="/paper airplane.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Paper plane 2 — opposite arc */}
        <div
          style={{
            position: 'absolute',
            top: '65%',
            right: 0,
            width: 44,
            height: 34,
            animation: 'paper-plane-arc2 24s ease-in-out infinite',
            animationDelay: '10s',
          }}
        >
          <img src="/paper airplane.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Cloud 1 — drifts slowly across */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: 0,
            width: 160,
            height: 70,
            animation: 'cloud-drift 30s linear infinite',
            animationDelay: '0s',
          }}
        >
          <img src="/cloud.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Cloud 2 — mid height */}
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: 0,
            width: 120,
            height: 55,
            animation: 'cloud-drift-slow 38s linear infinite',
            animationDelay: '12s',
          }}
        >
          <img src="/cloud.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Cloud 3 — near bottom */}
        <div
          style={{
            position: 'absolute',
            top: '75%',
            left: 0,
            width: 140,
            height: 60,
            animation: 'cloud-drift 46s linear infinite',
            animationDelay: '22s',
          }}
        >
          <img src="/cloud.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Orange star — top left float */}
        <div
          style={{
            position: 'absolute',
            top: '22%',
            left: '8%',
            width: 28,
            height: 28,
            animation: 'star-pulse 3.5s ease-in-out infinite',
            animationDelay: '0.5s',
          }}
        >
          <img src="/Orange Star.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Blue star — mid right */}
        <div
          style={{
            position: 'absolute',
            top: '48%',
            right: '12%',
            width: 24,
            height: 24,
            animation: 'star-pulse 4.2s ease-in-out infinite',
            animationDelay: '1.8s',
          }}
        >
          <img src="/Blue Star.svg" alt="" className="h-full w-full object-contain" />
        </div>

        {/* Green star — bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: '18%',
            right: '20%',
            width: 20,
            height: 20,
            animation: 'star-pulse 5s ease-in-out infinite',
            animationDelay: '3s',
          }}
        >
          <img src="/Green star.svg" alt="" className="h-full w-full object-contain" />
        </div>
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
