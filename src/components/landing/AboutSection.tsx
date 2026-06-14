'use client'

import { motion } from 'framer-motion'
import { GraduationCap, Telescope } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useScrollStore } from '@/lib/stores/scrollStore'
import { LandingDecor } from './LandingDecor'
import { useNavigateWithTransition } from './ScrollContainer'

export function AboutSection() {
  const navigate = useNavigateWithTransition()
  const highlightAce = useScrollStore((s) => s.highlightAce)
  const setHighlightAce = useScrollStore((s) => s.setHighlightAce)

  const handleAce = () => {
    setHighlightAce(false)
    navigate(2)
  }

  const handleDreamer = () => {
    navigate(4)
  }

  return (
    <div className="bg-texture relative flex h-full flex-col items-center justify-center overflow-y-auto bg-bg px-5 py-24 md:px-10">

      {/* ── Illustration layer ───────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        <LandingDecor
          src="/sad student on bench.svg"
          size="figure-lg"
          hideBelowLg
          className="bottom-[4%] left-[2%]"
          style={{ animation: 'float-bob 7s ease-in-out infinite', animationDelay: '0.5s' }}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 0.2, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
        />

        <LandingDecor
          src="/thought cloud with graduation cap.svg"
          size="accent"
          hideBelowLg
          className="bottom-[34%] left-[6%]"
          style={{ animation: 'float-bob 5s ease-in-out infinite', animationDelay: '1s' }}
          opacity={0.18}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 0.18, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.7 }}
        />

        <LandingDecor
          src="/confident student standing.svg"
          size="figure"
          hideBelowLg
          className="bottom-[4%] right-[3%]"
          style={{ animation: 'float-bob-delayed 6s ease-in-out infinite', animationDelay: '2s' }}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 0.2, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
        />

        <LandingDecor
          src="/3 lines.svg"
          size="prop"
          hideBelowLg
          className="bottom-[28%] right-[7%]"
          style={{ animation: 'star-pulse 2.5s ease-in-out infinite' }}
          opacity={0.3}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.3 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1 }}
        />

        <LandingDecor
          src="/stack of documents.svg"
          size="prop"
          hideBelowMd
          className="bottom-[4%] left-[14%]"
          opacity={0.15}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.9 }}
        />

        <LandingDecor
          src="/travel bag.svg"
          size="prop"
          hideBelowMd
          className="bottom-[4%] right-[14%]"
          style={{ animation: 'float-bob 8s ease-in-out infinite', animationDelay: '0.3s' }}
          opacity={0.15}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.1 }}
        />

        <LandingDecor
          src="/Orange Star.svg"
          size="star"
          className="left-[20%] top-[12%]"
          style={{ animation: 'star-pulse 3.8s ease-in-out infinite', animationDelay: '0.2s' }}
          opacity={0.25}
        />

        <LandingDecor
          src="/Blue Star.svg"
          size="star"
          className="right-[18%] top-[20%]"
          style={{ animation: 'star-pulse 4.5s ease-in-out infinite', animationDelay: '1.4s' }}
          opacity={0.25}
        />

        <LandingDecor
          src="/Green star.svg"
          size="star"
          className="left-[40%] top-[60%]"
          style={{ animation: 'star-pulse 5.2s ease-in-out infinite', animationDelay: '2.1s' }}
          opacity={0.2}
          hideBelowMd
        />
      </div>
      {/* ── /Illustration layer ──────────────────────────────────── */}

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            who we are
          </p>
          <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-tight text-blue lowercase">
            we don&apos;t just
            <br />
            send you abroad
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-text/80 md:text-base">
            We are a Pakistan-based consultancy that combines real human
            counselors with AI to make overseas education actually achievable
            — not just a dream.
          </p>
        </motion.div>

        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            <Card
              variant="dark"
              highlighted={highlightAce}
              className="flex h-full flex-col items-start gap-4 text-left"
            >
              <GraduationCap className="h-8 w-8 text-green" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold lowercase text-bg">
                i want to ace my future
              </h3>
              <p className="text-sm text-bg/70">
                I&apos;m serious. Let&apos;s build my path.
              </p>
              <Button
                onClick={handleAce}
                className="mt-auto border-green bg-green text-text hover:opacity-90"
              >
                let&apos;s go →
              </Button>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            <Card variant="light" className="flex h-full flex-col items-start gap-4 text-left">
              <Telescope className="h-8 w-8 text-blue" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold lowercase text-blue">
                i&apos;m just a dreamer for now
              </h3>
              <p className="text-sm text-text/70">
                Show me what&apos;s possible first.
              </p>
              <Button variant="secondary" onClick={handleDreamer} className="mt-auto">
                explore →
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
