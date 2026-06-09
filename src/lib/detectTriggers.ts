export const FEAR_SIGNALS = [
  'scared',
  'worried',
  'what if',
  'risk',
  'guarantee',
  'refused',
  'darr',
  'fikar',
  'guaranteed',
  'sure',
  'certain',
  'fail',
  'waste',
  'log kya',
  'people will',
  'family thinks',
  'parents say',
] as const

export const LEGAL_SIGNALS = [
  'refused',
  'rejection',
  'rejected',
  'ban',
  'banned',
  'case',
  'visa refusal',
  'previous',
  'before i applied',
  'got rejected',
] as const

export const READINESS_SIGNALS = [
  'ready',
  'how much',
  'fees',
  'next step',
  'start',
  'sign up',
  'register',
  'i want to',
  "let's do",
  'when can',
  'how do i begin',
] as const

export type TriggerInternalState = {
  stage: number
  fear_count: number
  stall_count: number
  regional_context_loaded: boolean
  legal_context_loaded: boolean
  qualification_score: number
}

export type TriggerFlags = {
  psychological: boolean
  regional: boolean
  legal: boolean
  negotiation: boolean
  sales: boolean
  educational: boolean
}

export function getLastStudentMessagesText(
  conversationHistory: Array<{ role: string; content: string }>,
  count = 3
): string {
  const studentMessages = conversationHistory
    .filter((msg) => msg.role === 'user')
    .slice(-count)
    .map((msg) => msg.content)

  return studentMessages.join(' ').toLowerCase()
}

export function countFearSignals(text: string): number {
  const lower = text.toLowerCase()
  return FEAR_SIGNALS.filter((signal) => lower.includes(signal)).length
}

export function hasLegalSignal(text: string): boolean {
  const lower = text.toLowerCase()
  return LEGAL_SIGNALS.some((signal) => lower.includes(signal))
}

export function hasReadinessSignal(text: string): boolean {
  const lower = text.toLowerCase()
  return READINESS_SIGNALS.some((signal) => lower.includes(signal))
}

export function detectTriggers(
  conversationHistory: Array<{ role: string; content: string }>,
  internalState: TriggerInternalState
): TriggerFlags {
  const joined = getLastStudentMessagesText(conversationHistory)
  const fearCount = countFearSignals(joined)

  return {
    psychological: fearCount >= 2 && internalState.fear_count < 2,
    regional: !internalState.regional_context_loaded,
    legal: hasLegalSignal(joined) && !internalState.legal_context_loaded,
    negotiation: internalState.stall_count >= 3,
    sales:
      hasReadinessSignal(joined) && internalState.qualification_score >= 6,
    educational:
      internalState.stage >= 2 && internalState.qualification_score >= 3,
  }
}
