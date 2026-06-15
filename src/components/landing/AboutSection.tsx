'use client'

import { motion } from 'framer-motion'
import { GraduationCap, Telescope } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useScrollStore } from '@/lib/stores/scrollStore'
import { LandingDecor } from './LandingDecor'
import { useNavigateWithTransition } from './ScrollContainer'

// ── Layout config — tweak sizes & positions here without touching JSX ─────
const LAYOUT = {
  figureLeft:   { width: 'clamp(480px, 40vw, 680px)', bottom: '-2%', left: '0%' },
  // Sad student 2× larger, stays on right
  figureRight:  { width: 'clamp(700px, 65vw, 1040px)', bottom: '-2%', right: '-2%' },
  // Thought cloud moved to top-left corner
  thoughtCloud: { width: '160px', top: '6%', left: '2%' },
  threeLines:   { width: '90px',  bottom: '28%', right: '7%' },
  stackDocs:    { width: '100px', bottom: '4%',  left: '14%' },
  // Travel bag behind sad student — same right anchor, positioned at bottom
  travelBag:    { width: '360px', bottom: '-4%', right: '4%' },
}

export function AboutSection() {
  const navigate = useNavigateWithTransition()
  const highlightAce = useScrollStore((s) => s.highlightAce)
  const setHighlightAce = useScrollStore((s) => s.setHighlightAce)

  const handleAce = () => {
    setHighlightAce(false)
    navigate(2)
  }

  const handleDreamer = () => {
    navigate(5)
  }

  return (
    <div className="bg-texture relative flex h-full flex-col items-center justify-center overflow-y-auto bg-bg px-4 py-8 md:px-10 md:py-24">

      {/* ── Illustration layer ───────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        {/* Left figure: student with files */}
        <LandingDecor
          src="/student with files.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.figureLeft.width,
            bottom: LAYOUT.figureLeft.bottom,
            left: LAYOUT.figureLeft.left,
          }}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
        />

        {/* Thought cloud — top-left corner */}
        <LandingDecor
          src="/thought cloud with graduation cap.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.thoughtCloud.width,
            top: LAYOUT.thoughtCloud.top,
            left: LAYOUT.thoughtCloud.left,
            animation: 'float-bob 5s ease-in-out infinite',
            animationDelay: '1s',
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.7 }}
        />

        {/* Travel bag — rendered BEFORE sad student so it appears behind him */}
        <LandingDecor
          src="/travel bag.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.travelBag.width,
            bottom: LAYOUT.travelBag.bottom,
            right: LAYOUT.travelBag.right,
            animation: 'float-bob 8s ease-in-out infinite',
            animationDelay: '0.3s',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.1 }}
        />

        {/* Right figure: sad student on bench — 2× larger, renders in front of bag */}
        <LandingDecor
          src="/sad student on bench.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.figureRight.width,
            bottom: LAYOUT.figureRight.bottom,
            right: LAYOUT.figureRight.right,
          }}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
        />

        {/* 3 lines — right side */}
        <LandingDecor
          src="/3 lines.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.threeLines.width,
            bottom: LAYOUT.threeLines.bottom,
            right: LAYOUT.threeLines.right,
            animation: 'star-pulse 2.5s ease-in-out infinite',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1 }}
        />

        {/* Stack of documents */}
        <LandingDecor
          src="/stack of documents.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.stackDocs.width,
            bottom: LAYOUT.stackDocs.bottom,
            left: LAYOUT.stackDocs.left,
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.9 }}
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
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-5 text-center md:gap-8">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-orange md:mb-3">
            Who we are
          </p>
          <h2 className="text-[clamp(1.6rem,6vw,3.5rem)] font-semibold leading-tight text-blue">
            We don&apos;t just
            <br />
            send you abroad
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text/80 md:mt-5 md:text-base">
            Pakistan based Education Consultant combining real counselors with AI
            to make overseas education achievable — not just a dream.
          </p>
        </motion.div>

        {/* Cards — side-by-side on ALL screen sizes */}
        <div className="grid w-full grid-cols-2 gap-3 md:gap-6">

          {/* Card 1: Ace my future — dark teal / green button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="flex"
          >
            <Card
              variant="dark"
              highlighted={highlightAce}
              className="flex w-full flex-col items-start gap-3 p-4 text-left md:gap-4 md:p-6"
            >
              <GraduationCap className="h-6 w-6 text-green md:h-8 md:w-8" strokeWidth={1.5} />
              <h3 className="text-[clamp(0.85rem,2.5vw,1.25rem)] font-semibold leading-snug text-bg">
                I Want to Ace My Future
              </h3>
              <p className="hidden text-sm text-bg/70 sm:block">
                I&apos;m serious. Let&apos;s build my path.
              </p>
              <Button
                onClick={handleAce}
                className="mt-auto w-full border-green bg-green py-2 text-xs text-text hover:opacity-90 md:py-3 md:text-sm"
              >
                let&apos;s go →
              </Button>
            </Card>
          </motion.div>

          {/* Card 2: Dreamer — orange */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="flex"
          >
            <Card
              variant="dark"
              className="flex w-full flex-col items-start gap-3 p-4 text-left md:gap-4 md:p-6"
              style={{ background: 'var(--grad-orange)' }}
            >
              <Telescope className="h-6 w-6 text-white md:h-8 md:w-8" strokeWidth={1.5} />
              <h3 className="text-[clamp(0.85rem,2.5vw,1.25rem)] font-semibold leading-snug text-white">
                I&apos;m just a dreamer for now
              </h3>
              <p className="hidden text-sm text-white/70 sm:block">
                Show me what&apos;s possible first.
              </p>
              <Button
                onClick={handleDreamer}
                className="mt-auto w-full border-white/30 bg-white/15 py-2 text-xs text-white hover:bg-white/25 md:py-3 md:text-sm"
              >
                explore →
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
