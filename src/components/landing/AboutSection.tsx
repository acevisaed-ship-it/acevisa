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
  // Sad student — reverted to original size
  figureRight:  { width: 'clamp(480px, 40vw, 680px)', bottom: '-2%', right: '0%' },
  // Thought cloud — above the standing student's head
  thoughtCloud: { width: '140px', bottom: '66%', left: '20%' },
  threeLines:   { width: '90px',  bottom: '28%', right: '7%' },
  stackDocs:    { width: '100px', bottom: '62%', right: '22%' },
  // Travel bag — moved behind sad student (rendered before him in DOM)
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
    <div className="bg-texture relative flex h-full flex-col items-center overflow-y-auto px-4 py-8 md:justify-center md:px-10 md:py-24" style={{ background: 'var(--grad-blue)' }}>

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

        {/* Thought cloud — near left figure's upper body */}
        <LandingDecor
          src="/thought cloud with graduation cap.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.thoughtCloud.width,
            bottom: LAYOUT.thoughtCloud.bottom,
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

        {/* Stack of documents — above sad student's head */}
        <LandingDecor
          src="/stack of documents.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.stackDocs.width,
            bottom: LAYOUT.stackDocs.bottom,
            right: LAYOUT.stackDocs.right,
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

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT — heading + two tall vertical cards
          each card contains the SVG, title, button.
      ═════════════════════════════════════════════ */}
      <div className="relative z-10 flex h-full w-full flex-col md:hidden">

        {/* Compact heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="px-4 pb-2 pt-4 text-center"
        >
          <p className="text-[10px] font-medium uppercase tracking-widest text-orange">Who we are</p>
          <h2 className="text-2xl font-semibold leading-tight text-white">
            We don&apos;t just send you abroad
          </h2>
        </motion.div>

        {/* Two vertical cards filling remaining height */}
        <div className="flex flex-1 gap-2 px-3 pb-3">

          {/* Card 1 — Ace My Future */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="flex flex-1"
          >
            <Card
              variant="dark"
              highlighted={highlightAce}
              className="flex w-full flex-col items-center gap-2 p-3 text-center"
            >
              {/* SVG fills available vertical space */}
              <div className="flex flex-1 items-end justify-center overflow-hidden">
                <img
                  src="/student with files.svg"
                  alt=""
                  aria-hidden
                  className="h-full max-h-[45vh] w-auto object-contain object-bottom"
                />
              </div>
              <h3 className="text-sm font-semibold leading-snug text-bg">
                I Want to Ace My Future
              </h3>
              <Button
                onClick={handleAce}
                className="w-full border-green bg-green py-2 text-xs text-text hover:opacity-90"
              >
                let&apos;s go →
              </Button>
            </Card>
          </motion.div>

          {/* Card 2 — Dreamer */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08, ease: 'easeInOut' }}
            className="flex flex-1"
          >
            <Card
              variant="dark"
              className="flex w-full flex-col items-center gap-2 p-3 text-center"
              style={{ background: 'var(--grad-orange)' }}
            >
              {/* SVG fills available vertical space */}
              <div className="flex flex-1 items-end justify-center overflow-hidden">
                <img
                  src="/sad student on bench.svg"
                  alt=""
                  aria-hidden
                  className="h-full max-h-[45vh] w-auto object-contain object-bottom"
                />
              </div>
              <h3 className="text-sm font-semibold leading-snug text-white">
                I&apos;m just a dreamer for now
              </h3>
              <Button
                onClick={handleDreamer}
                className="w-full border-white/30 bg-white/15 py-2 text-xs text-white hover:bg-white/25"
              >
                explore →
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT
      ═════════════════════════════════════════════ */}
      <div className="relative z-10 mx-auto hidden w-full max-w-4xl flex-col items-center gap-5 text-center md:flex md:gap-8">

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
          <h2 className="text-[clamp(1.6rem,6vw,3.5rem)] font-semibold leading-tight text-white">
            We don&apos;t just
            <br />
            send you abroad
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:mt-5 md:text-base">
            Pakistan based Education Consultant combining real counselors with AI
            to make overseas education achievable — not just a dream.
          </p>
        </motion.div>

        {/* Cards — side-by-side */}
        <div className="grid w-full grid-cols-2 gap-6">

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
              className="flex w-full flex-col items-start gap-4 p-6 text-left"
            >
              <GraduationCap className="h-8 w-8 text-green" strokeWidth={1.5} />
              <h3 className="text-[clamp(0.85rem,2.5vw,1.25rem)] font-semibold leading-snug text-bg">
                I Want to Ace My Future
              </h3>
              <p className="text-sm text-bg/70">I&apos;m serious. Let&apos;s build my path.</p>
              <Button
                onClick={handleAce}
                className="mt-auto w-full border-green bg-green py-3 text-sm text-text hover:opacity-90"
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
            className="flex"
          >
            <Card
              variant="dark"
              className="flex w-full flex-col items-start gap-4 p-6 text-left"
              style={{ background: 'var(--grad-orange)' }}
            >
              <Telescope className="h-8 w-8 text-white" strokeWidth={1.5} />
              <h3 className="text-[clamp(0.85rem,2.5vw,1.25rem)] font-semibold leading-snug text-white">
                I&apos;m just a dreamer for now
              </h3>
              <p className="text-sm text-white/70">Show me what&apos;s possible first.</p>
              <Button
                onClick={handleDreamer}
                className="mt-auto w-full border-white/30 bg-white/15 py-3 text-sm text-white hover:bg-white/25"
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
