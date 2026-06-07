'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ANIMATION_MS,
  useTransitionStore,
} from '@/lib/stores/transitionStore'

function AirplaneTransitionOverlay() {
  const isPlaying = useTransitionStore((s) => s.isPlaying)
  const playId = useTransitionStore((s) => s.playId)

  if (!isPlaying) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      aria-hidden={false}
    >
      <motion.div
        key={playId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 bg-black/30"
      >
        <motion.div
          initial={{ y: '25vh', x: '-50%', opacity: 1 }}
          animate={{ y: '-80vh', x: '-50%', opacity: [1, 1, 0] }}
          transition={{
            duration: ANIMATION_MS / 1000,
            ease: 'easeInOut',
          }}
          className="absolute left-1/2 top-1/2"
        >
          <img
            src="/plane.png"
            alt=""
            aria-hidden="true"
            className="h-auto w-[180px] md:w-[280px]"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <AirplaneTransitionOverlay />
      {children}
    </>
  )
}

export function AirplaneTransition() {
  return <AirplaneTransitionOverlay />
}
