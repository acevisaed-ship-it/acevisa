import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  size?: 'sm' | 'md' | 'lg'
  alt?: string
  onClick?: () => void
  className?: string
}

const imgSize = {
  sm: 'h-7 w-auto',
  md: 'h-8 w-auto',
  lg: 'h-9 w-auto',
} as const

export function LogoHomeLink({
  href,
  size = 'md',
  alt = 'ACE Altius Consulting',
  onClick,
  className,
}: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label="Go to dashboard"
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5 transition-opacity hover:opacity-80',
        className
      )}
    >
      <img src="/logo.png" alt={alt} className={imgSize[size]} />
    </Link>
  )
}
