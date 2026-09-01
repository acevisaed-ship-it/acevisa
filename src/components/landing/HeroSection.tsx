'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PWAInstallButton } from '@/components/PWAInstallButton'
import { useNavigateWithTransition } from './ScrollContainer'
import { HeroAnimations } from './HeroAnimations'
import { EarthSphere } from './EarthSphere'

// ── Desktop globe: fills right half of viewport ──────────────────────────────
function EarthSphereDesktop() {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      setSize(Math.min(780, Math.max(520, Math.min(vw * 0.55, vh * 0.78))))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (!size) return null
  return <EarthSphere size={size} />
}

// ── Mobile globe: compact, fits in narrow left column ────────────────────────
function EarthSphereMobile() {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const update = () => {
      // ~44 % of viewport width, capped between 120 px and 200 px
      setSize(Math.min(200, Math.max(120, Math.round(window.innerWidth * 0.44))))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (!size) return null
  return <EarthSphere size={size} />
}

const stats = [
  { value: '500+', label: 'Students Placed' },
  { value: '4',    label: 'Countries' },
  { value: '9.2/10', label: 'Satisfaction' },
]

export function HeroSection() {
  const navigate = useNavigateWithTransition()

  return (
    <div className="bg-texture relative flex h-full overflow-hidden bg-bg">

      {/* Animated background */}
      <HeroAnimations />

      {/* ═══════════════════════════════════════════════════════════
          MOBILE LAYOUT  (< md)
          Left col:  globe at top, man-pointing pinned to bottom
          Right col: ACE logo → headline → CTA → stats strip
      ════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex h-full w-full flex-col md:hidden">

        {/* Top area — ACE logo (left) + globe + man (right), fills available space */}
        <div className="grid flex-1 grid-cols-[54%_46%] items-start pt-16">

          {/* Left col — ACE logo + tagline */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="flex flex-col gap-2 pl-3 pt-4"
          >
            <img
              src="/Hero Page LOGO.svg"
              alt="ACE Altius Consulting"
              className="h-auto w-full max-w-[190px]"
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange">
              Pakistan&apos;s First AI Platform
            </p>
          </motion.div>

          {/* Right col — globe + man (flipped so he faces left toward logo) */}
          <div className="relative flex h-full flex-col items-center">
            <div className="mt-4 flex items-center justify-center">
              <EarthSphereMobile />
            </div>
            {/* Man pointing — scaleX(-1) so he faces left toward the ACE logo */}
            <div
              className="pointer-events-none absolute bottom-0 right-0 w-full"
              aria-hidden="true"
            >
              <img
                src="/man pointing to ace.svg"
                alt=""
                className="w-full object-contain object-bottom"
                style={{ maxHeight: '57vh', transform: 'scaleX(-1)' }}
              />
            </div>
          </div>
        </div>

        {/* Heading + CTA — above stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeInOut' }}
          className="px-4 pb-3"
        >
          <h1
            className="font-semibold leading-[0.92] tracking-tight text-blue"
            style={{ fontSize: 'clamp(1.5rem, 6vw, 2.2rem)' }}
          >
            Ace Your
            <br />
            Future Here
          </h1>
          <p className="mt-1.5 text-[11px] leading-snug text-text/70">
            AI-Powered Guidance. Real Counselors. Real Results.
          </p>
          <Button
            onClick={() => navigate(1)}
            className="mt-3 w-full py-3 text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #E48328 0%, #2083B9 100%)',
              border: 'none',
            }}
          >
            Start Your Journey →
          </Button>
          <Link
            href="/return"
            className="mt-2 block text-[11px] text-text/60 underline-offset-2 hover:underline"
          >
            Already Registered? Return here →
          </Link>
          <Link
            href="/portal/login"
            className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-grad-blue py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg hover:brightness-110 active:scale-95"
          >
            Student Portal
          </Link>
        </motion.div>

        {/* Stats strip — very bottom */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeInOut' }}
          className="mx-3 mb-3 rounded-2xl border border-text/10 bg-bg/80 px-4 py-3 backdrop-blur-sm"
        >
          <div className="flex justify-between">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <p className="text-base font-semibold text-blue">{stat.value}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-text/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (md+)
          Globe: absolutely positioned right side
          Man:   absolutely positioned bottom-left
          Content: centred grid, weighted left
      ════════════════════════════════════════════════════════════ */}

      {/* Globe — desktop only */}
      <div
        className="pointer-events-none absolute right-[1%] top-1/2 z-[4] hidden md:block"
        style={{ transform: 'translateY(-50%)' }}
      >
        <EarthSphereDesktop />
      </div>

      {/* Man pointing — desktop only */}
      <div
        className="pointer-events-none absolute bottom-0 z-[6] hidden md:block"
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

      {/* Desktop content grid */}
      <div className="relative z-10 mx-auto hidden w-full max-w-5xl items-center md:grid md:grid-cols-1 md:gap-8 md:px-12 md:py-24 lg:grid-cols-2 lg:gap-10 lg:px-16 lg:pr-[8%]">

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
            className="h-auto w-full max-w-[280px] md:max-w-[420px]"
          />

          <p className="text-xs font-bold uppercase tracking-widest text-orange md:text-base">
            Pakistan&apos;s First AI Consultancy Platform
          </p>

          <h1 className="pl-3 text-[clamp(2rem,6vw,5rem)] font-semibold leading-[0.95] tracking-tight text-blue md:pl-8">
            Ace Your
            <br />
            Future Here
          </h1>

          <p className="max-w-sm text-sm text-text/70 md:text-base md:text-lg">
            AI-Powered Guidance. Real Counselors. Real Results.
          </p>

          <div className="flex flex-col gap-3 sm:block">
            <Button
              onClick={() => navigate(1)}
              className="mt-2 w-full py-4 text-base font-semibold text-white sm:w-auto sm:px-10 sm:py-5 sm:text-lg"
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

            <Link
              href="/portal/login"
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-grad-blue py-4 text-base font-semibold text-white transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg hover:brightness-110 active:scale-95 sm:w-auto sm:px-10 sm:py-5 sm:text-lg"
            >
              Student Portal
            </Link>

            <PWAInstallButton className="mt-3 inline-flex items-center gap-2 rounded-full border border-text/20 px-4 py-2 text-sm font-medium text-text/70 transition-colors hover:border-text/40 hover:text-text md:text-base" />
          </div>
        </motion.div>

        {/* Stats card column — desktop */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeInOut' }}
          className="flex w-full justify-center lg:justify-end"
        >
          <Card variant="glass" className="w-full max-w-sm space-y-6 p-8">
            {stats.map((stat) => (
              <div key={stat.label} className="border-b border-text/10 pb-4 last:border-0 last:pb-0">
                <p className="text-4xl font-semibold text-blue md:text-5xl">{stat.value}</p>
                <p className="mt-1 text-base text-text/70 md:text-lg">{stat.label}</p>
              </div>
            ))}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
