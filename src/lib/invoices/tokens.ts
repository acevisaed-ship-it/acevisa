import { createHash, randomBytes } from 'crypto'

const TOKEN_BYTES = 32

export function generateConsentToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashConsentToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip, 'utf8').digest('hex')
}

export function firstNameOf(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0]
  return part || 'there'
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'https://acevisa.vercel.app'
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || '0.0.0.0'
}

export function consentExpiresAt(from = new Date(), days = 7): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}
