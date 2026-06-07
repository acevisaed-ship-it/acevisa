'use client'

import { motion } from 'framer-motion'
import { GraduationCap, Telescope } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useScrollStore } from '@/lib/stores/scrollStore'
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
    <div className="bg-texture flex h-full flex-col items-center justify-center overflow-y-auto bg-bg px-5 py-24 md:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 text-center">
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

        <div className="grid w-full gap-5 md:grid-cols-2 md:gap-6">
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
