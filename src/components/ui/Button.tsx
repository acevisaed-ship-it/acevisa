'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-orange text-text hover:opacity-90 border border-orange',
  secondary:
    'bg-transparent text-text border border-text/30 hover:border-text/60',
  ghost:
    'bg-transparent text-text border border-transparent hover:border-text/20',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-700 ease-in-out disabled:opacity-50',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
