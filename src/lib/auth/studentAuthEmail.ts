/**
 * Supabase Auth requires an email address. When a student registers without a
 * contact email, we create their auth user with a deterministic internal address.
 * That address is NEVER stored on clients.email (contact field stays null).
 */
export const STUDENT_AUTH_EMAIL_DOMAIN = 'students.aceyourvisa.internal'

export function isSyntheticStudentAuthEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${STUDENT_AUTH_EMAIL_DOMAIN}`)
}

/** Real contact email for outbound mail — null if missing or synthetic. */
export function studentContactEmail(email: string | null | undefined): string | null {
  if (!email?.trim()) return null
  const trimmed = email.trim().toLowerCase()
  if (isSyntheticStudentAuthEmail(trimmed)) return null
  return trimmed
}

/** Email used for Supabase Auth sign-in / createUser (real or synthetic). */
export function studentLoginAuthEmail(opts: {
  email: string | null | undefined
  clientId: string
}): string {
  return studentContactEmail(opts.email) ?? `client-${opts.clientId}@${STUDENT_AUTH_EMAIL_DOMAIN}`
}
