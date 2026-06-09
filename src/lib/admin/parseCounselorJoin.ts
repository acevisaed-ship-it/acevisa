type NamedJoin = { name: string } | { name: string }[] | null | undefined

export function parseCounselorName(counselors: NamedJoin): string | null {
  if (!counselors) return null
  if (Array.isArray(counselors)) return counselors[0]?.name ?? null
  return counselors.name
}

export function parseClientJoin(
  clients: ({ name: string; id: string } | { name: string; id: string }[]) | null | undefined
): { name: string; id: string } | null {
  if (!clients) return null
  if (Array.isArray(clients)) return clients[0] ?? null
  return clients
}
