'use client'

import { motion, type MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

export type LandingDecorSize =
  | 'star'
  | 'prop'
  | 'accent'
  | 'figure'
  | 'figure-lg'
  | 'globe'
  | 'globe-sm'
  | 'cloud'
  | 'plane'

const SIZE_CLASSES: Record<LandingDecorSize, string> = {
  star: 'landing-decor-star',
  prop: 'landing-decor-prop',
  accent: 'landing-decor-accent',
  figure: 'landing-decor-figure',
  'figure-lg': 'landing-decor-figure-lg',
  globe: 'landing-decor-globe',
  'globe-sm': 'landing-decor-globe-sm',
  cloud: 'landing-decor-cloud',
  plane: 'landing-decor-plane',
}

interface LandingDecorProps extends MotionProps {
  src: string
  size?: LandingDecorSize
  className?: string
  style?: CSSProperties
  opacity?: number
  hideMobile?: boolean
  hideBelowMd?: boolean
  hideBelowLg?: boolean
}

export function LandingDecor({
  src,
  size = 'accent',
  className,
  style,
  opacity = 0.2,
  hideMobile,
  hideBelowMd,
  hideBelowLg,
  ...motionProps
}: LandingDecorProps) {
  const classes = cn(
    'pointer-events-none absolute h-auto',
    SIZE_CLASSES[size],
    hideMobile && 'hidden sm:block',
    hideBelowMd && 'hidden md:block',
    hideBelowLg && 'hidden lg:block',
    className,
  )

  const hasMotion = Object.keys(motionProps).length > 0

  if (hasMotion) {
    return (
      <motion.div
        className={classes}
        style={{ opacity, ...style }}
        aria-hidden="true"
        {...motionProps}
      >
        <img src={src} alt="" className="h-auto w-full object-contain" />
      </motion.div>
    )
  }

  return (
    <div className={classes} style={{ opacity, ...style }} aria-hidden="true">
      <img src={src} alt="" className="h-auto w-full object-contain" />
    </div>
  )
}
