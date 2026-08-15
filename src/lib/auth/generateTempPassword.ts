/**
 * Generate a readable-but-not-guessable temporary password.
 * 3 letters + 4 digits + 2 letters, e.g. "kxp4821qm".
 * Avoids visually ambiguous characters (i/l/o, 0/1).
 */
export function generateTempPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz' // no i/l/o
  const digits = '23456789' // no 0/1
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${pick(letters, 3)}${pick(digits, 4)}${pick(letters, 2)}`
}
