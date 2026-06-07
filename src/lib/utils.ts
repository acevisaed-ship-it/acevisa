import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert UTC to PKT (UTC+5)
export function toPKT(date: Date | string): Date {
  const d = new Date(date)
  return new Date(d.getTime() + 5 * 60 * 60 * 1000)
}

// Convert PKT to UTC for storage
export function toUTC(date: Date | string): Date {
  const d = new Date(date)
  return new Date(d.getTime() - 5 * 60 * 60 * 1000)
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const port = process.env.PORT || '3001'
  return `http://localhost:${port}`
}
