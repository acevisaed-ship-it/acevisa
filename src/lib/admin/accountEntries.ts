export function canMutateAccountEntries(role: string): boolean {
  return role === 'ceo'
}

export type FieldChange = { from: unknown; to: unknown }

export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of keys) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
      changes[key] = { from: before[key] ?? null, to: after[key] ?? null }
    }
  }
  return changes
}

function formatVal(value: unknown): string {
  if (value == null || value === '') return 'empty'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function formatFieldChanges(changes: Record<string, FieldChange>): string {
  return Object.entries(changes)
    .map(([key, change]) => `${key} ${formatVal(change.from)} → ${formatVal(change.to)}`)
    .join(', ')
}
