'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardVariant = 'dark' | 'light' | 'glass'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  highlighted?: boolean
}

const variants: Record<CardVariant, string> = {
  dark: 'bg-text text-bg border border-text/20',
  light: 'bg-bg text-text border border-text/[0.12]',
  glass: 'bg-bg/80 backdrop-blur-xl text-text border border-text/[0.12] shadow-lg shadow-text/5',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'light', highlighted, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-card p-6 transition-all duration-700 ease-in-out',
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
