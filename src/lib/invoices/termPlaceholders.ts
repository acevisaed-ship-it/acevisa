const PLACEHOLDER = /\[[^\[\]]{1,300}\]/g

export function findUnfilledTermPlaceholders(text: string): string[] {
  const matches = text.match(PLACEHOLDER) ?? []
  const unique: string[] = []
  for (const match of matches) {
    const normalised = match.replace(/\s+/g, ' ').trim()
    if (!unique.includes(normalised)) unique.push(normalised)
  }
  return unique
}
