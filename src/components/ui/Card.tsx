'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardVariant = 'dark' | 'light' | 'glass' | 'green' | 'blue'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  highlighted?: boolean
}

const variants: Record<CardVariant, string> = {
  dark:  'bg-grad-teal text-bg crisp-on-dark',
  light: 'bg-grad-bg   text-text crisp',
  glass: 'bg-bg/80 backdrop-blur-xl text-text crisp shadow-sm shadow-text/[0.04]',
  // Front-desk action rails — grad-green is light, so it pairs with dark
  // text like `light`; grad-blue is dark enough to pair with light text
  // like `dark`. Components using these should reach for text-text/…  and
  // .glass-input-dark on green, but can keep text-bg/… and .glass-input as-is
  // on blue.
  green: 'bg-grad-green text-text crisp',
  blue:  'bg-grad-blue text-bg crisp-on-dark',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'light', highlighted, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Touch-safe interaction: active press feedback on all devices;
          // scale-up hover only on pointer devices (sm:hover won't trigger on touch)
          'rounded-card p-6 transition-all duration-200 ease-out active:scale-[0.98] sm:hover:scale-[1.025] sm:hover:-translate-y-1 sm:hover:shadow-xl',
          variants[variant],
          highlighted && 'ring-2 ring-orange ring-offset-2 ring-offset-bg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
