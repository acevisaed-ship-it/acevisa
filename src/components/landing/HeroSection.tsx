'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgba(32,131,185,0.25) 0%, transparent 70%)',
        }}
      />
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-orange/10 blur-3xl" />

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
