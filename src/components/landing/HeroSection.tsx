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

// Previous desktop formula: Math.min(780, Math.max(520, Math.min(vw * 0.55, vh * 0.78)))
// Reduced to 30% of that size (~70% smaller) so the globe is an accent, not the layout.
function desktopGlobeSize(vw: number, vh: number) {
  const previous = Math.min(780, Math.max(520, Math.min(vw * 0.55, vh * 0.78)))
  return Math.round(previous * 0.3)
}

function EarthSphereDesktop() {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const update = () => setSize(desktopGlobeSize(window.innerWidth, window.innerHeight))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (!size) return null
  return <EarthSphere size={size} />
}

function EarthSphereMobile() {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const update = () => {
      // Mobile globe was already compact; keep it readable (~32% vw, 96–148px).
      setSize(Math.min(148, Math.max(96, Math.round(window.innerWidth * 0.32))))
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

const ctaButtonClass =
  'inline-flex min-h-[44px] w-[280px] items-center justify-center rounded-full py-3.5 text-base font-semibold text-white transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg hover:brightness-110 active:scale-95'

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

        {/* Top area — ACE logo (left) + globe + man (right) */}
        <div className="grid flex-1 grid-cols-[54%_46%] items-start pt-20">

          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="flex flex-col gap-2 px-4 pt-2"
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

          <div className="relative flex h-full flex-col items-center">
            <div className="mt-2 flex items-center justify-center">
              <EarthSphereMobile />
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center"
              aria-hidden="true"
            >
              <img
                src="/man pointing to ace.svg"
                alt=""
                className="w-full object-contain object-bottom"
                style={{ maxHeight: '48vh', transform: 'scaleX(-1)' }}
              />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeInOut' }}
          className="flex flex-col px-4 pb-4"
        >
          <h1
            className="font-semibold leading-[0.95] tracking-tight text-blue"
            style={{ fontSize: 'clamp(1.5rem, 6vw, 2.2rem)' }}
          >
            Ace Your
            <br />
            Future Here
          </h1>
          <p className="mt-4 text-xs leading-snug text-text/70">
            AI-Powered Guidance. Real Counselors. Real Results.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-4">
            <Button
              onClick={() => navigate(1)}
              className="w-full py-3 text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #E48328 0%, #2083B9 100%)',
                border: 'none',
              }}
            >
              Start Your Journey →
            </Button>
            <Link
              href="/return"
              className="block text-xs text-text/60 underline-offset-2 hover:underline"
            >
              Already Registered? Return here →
            </Link>
            <Link
              href="/portal/login"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-grad-blue py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg hover:brightness-110 active:scale-95"
            >
              Student Portal
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeInOut' }}
          className="mx-4 mb-4 rounded-2xl border border-text/10 bg-bg/80 px-4 py-4 backdrop-blur-sm"
        >
          <div className="flex justify-between">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <p className="text-base font-semibold text-blue">{stat.value}</p>
                <p className="mt-1 text-[10px] leading-tight text-text/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (md+)
          Left: copy + CTAs
          Right: stats card with globe overlapping its right edge
          Man: bottom-left, sitting on the section floor
      ════════════════════════════════════════════════════════════ */}

      <div
        className="pointer-events-none absolute bottom-0 left-0 z-[6] hidden md:block"
        aria-hidden="true"
      >
        <img
          src="/man pointing to ace.svg"
          alt=""
          className="w-auto object-contain object-bottom"
          style={{ height: 'clamp(220px, 34vh, 380px)' }}
        />
      </div>

      <div className="relative z-10 mx-auto hidden h-full w-full max-w-6xl items-center md:flex md:flex-row md:gap-6 md:px-10 md:py-20 lg:gap-16 lg:py-24">

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="flex min-w-0 flex-1 flex-col items-start"
        >
          <img
            src="/Hero Page LOGO.svg"
            alt="ACE Altius Consulting"
            className="h-auto w-full max-w-[280px] md:max-w-[360px]"
          />

          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-orange md:text-sm">
            Pakistan&apos;s First AI Consultancy Platform
          </p>

          <h1 className="mt-6 text-[clamp(2rem,5vw,4rem)] font-semibold leading-[0.95] tracking-tight text-blue">
            Ace Your
            <br />
            Future Here
          </h1>

          <p className="mt-4 max-w-sm text-sm text-text/70 md:text-base">
            AI-Powered Guidance. Real Counselors. Real Results.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4">
            <Button
              onClick={() => navigate(1)}
              className={ctaButtonClass}
              style={{
                background: 'linear-gradient(135deg, #E48328 0%, #2083B9 100%)',
                border: 'none',
              }}
            >
              Start Your Journey →
            </Button>

            <Link
              href="/return"
              className="max-w-full text-sm text-text/70 underline-offset-2 transition-all duration-200 hover:text-text hover:underline md:text-base"
            >
              Already Registered? → Return To Your Session
            </Link>

            <Link
              href="/portal/login"
              className={`${ctaButtonClass} bg-grad-blue`}
            >
              Student Portal
            </Link>

            <PWAInstallButton className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-text/20 px-4 py-2 text-sm font-medium text-text/70 transition-colors hover:border-text/40 hover:text-text" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeInOut' }}
          className="flex shrink-0 items-center justify-center lg:justify-end"
        >
          {/* Card in front, globe overlapping the right edge so ~half stays visible */}
          <div className="relative flex items-center">
            <Card variant="glass" className="relative z-10 w-[260px] shrink-0 space-y-4 p-6">
              {stats.map((stat) => (
                <div key={stat.label} className="border-b border-text/10 pb-4 last:border-0 last:pb-0">
                  <p className="text-3xl font-semibold text-blue md:text-4xl">{stat.value}</p>
                  <p className="mt-1 text-sm text-text/70 md:text-base">{stat.label}</p>
                </div>
              ))}
            </Card>
            <div
              className="pointer-events-none relative z-0 -ml-16 shrink-0 lg:-ml-12"
              aria-hidden="true"
            >
              <EarthSphereDesktop />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
