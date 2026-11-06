export type ConsentStatus = 'pending' | 'agreed' | 'expired' | 'revoked'

export type ActiveTermsIds = {
  generalId: string
  productId: string
}

export function consentSatisfiesCurrent(args: {
  status: ConsentStatus
  generalTermsId: string
  productTermsId: string
  active: ActiveTermsIds
}): boolean {
  return (
    args.status === 'agreed' &&
    args.generalTermsId === args.active.generalId &&
    args.productTermsId === args.active.productId
  )
}

export function publicTokenOutcome(args: {
  found: boolean
  status: ConsentStatus | null
  expiresAt: string | null
  now?: Date
}): 'invalid' | 'usable' {
  if (!args.found || !args.status || !args.expiresAt) return 'invalid'
  if (args.status !== 'pending') return 'invalid'
  const now = args.now ?? new Date()
  if (new Date(args.expiresAt).getTime() <= now.getTime()) return 'invalid'
  return 'usable'
}

export function clientsNeedingReagreement(countWithCurrentAgreed: number): number {
  return Math.max(0, countWithCurrentAgreed)
}

export function reminderDue(args: {
  status: ConsentStatus
  requestedAt: string
  expiresAt: string
  reminderSentAt: string | null
  now?: Date
}): boolean {
  if (args.status !== 'pending' || args.reminderSentAt) return false
  const now = args.now ?? new Date()
  const requested = new Date(args.requestedAt).getTime()
  const expires = new Date(args.expiresAt).getTime()
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000
  return now.getTime() >= requested + threeDaysMs && now.getTime() < expires
}

export function shouldExpire(args: {
  status: ConsentStatus
  expiresAt: string
  now?: Date
}): boolean {
  if (args.status !== 'pending') return false
  const now = args.now ?? new Date()
  return new Date(args.expiresAt).getTime() <= now.getTime()
}

export function displayConsentLabel(args: {
  invoiceStatus: string
  consentStatus: ConsentStatus | null
  agreedAt: string | null
}): string {
  if (args.consentStatus === 'agreed' && args.agreedAt) {
    const date = new Date(args.agreedAt).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `Agreed on ${date}`
  }
  if (args.consentStatus === 'pending' || args.invoiceStatus === 'awaiting_consent') {
    return 'Awaiting agreement'
  }
  if (args.consentStatus === 'expired') return 'Expired'
  if (args.consentStatus === 'revoked') return 'Revoked'
  return 'Not requested'
}
