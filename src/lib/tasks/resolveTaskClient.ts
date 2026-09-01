import type { SupabaseClient } from '@supabase/supabase-js'

export type ResolvedTaskClient = {
  id: string
  name: string
  client_code: string | null
}

const STOPWORDS = new Set([
  'about',
  'accounts',
  'added',
  'advance',
  'after',
  'also',
  'along',
  'answers',
  'april',
  'assign',
  'assigned',
  'august',
  'client',
  'clients',
  'collect',
  'complete',
  'confirmation',
  'counselor',
  'counselors',
  'create',
  'daily',
  'december',
  'department',
  'details',
  'document',
  'documents',
  'everyone',
  'evidence',
  'expenses',
  'february',
  'follow',
  'from',
  'information',
  'issue',
  'italy',
  'january',
  'july',
  'june',
  'kindly',
  'knowledge',
  'korea',
  'list',
  'manual',
  'members',
  'march',
  'may',
  'miss',
  'mister',
  'must',
  'next',
  'november',
  'october',
  'office',
  'other',
  'outstanding',
  'payment',
  'payments',
  'pending',
  'pipeline',
  'please',
  'policies',
  'prepare',
  'regions',
  'relevant',
  'report',
  'response',
  'september',
  'share',
  'south',
  'stage',
  'step',
  'task',
  'tasks',
  'team',
  'their',
  'this',
  'that',
  'today',
  'tomorrow',
  'training',
  'unassigned',
  'universities',
  'update',
  'with',
  'your',
])

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeToken(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, '').slice(0, 40)
}

function searchTokens(taskText: string): string[] {
  const words = normalize(taskText)
    .split(' ')
    .map(sanitizeToken)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word))

  const unique: string[] = []
  for (const word of words) {
    if (!unique.includes(word)) unique.push(word)
  }

  const phrases: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`)
  }

  return [...phrases, ...unique].slice(0, 8)
}

function scoreMatch(taskText: string, client: ResolvedTaskClient): number {
  const hay = ` ${normalize(taskText)} `
  const name = normalize(client.name)
  if (!name) return 0

  if (name.length >= 4 && hay.includes(` ${name} `)) return 100

  const code = client.client_code ? normalize(client.client_code) : ''
  if (code.length >= 3 && hay.includes(` ${code} `)) return 90

  const parts = name.split(' ').filter((part) => part.length >= 4 && !STOPWORDS.has(part))
  if (parts.length >= 2 && parts.every((part) => hay.includes(` ${part} `))) return 80

  let best = 0
  for (const part of parts) {
    if (!hay.includes(` ${part} `)) continue
    if (part.length >= 5) best = Math.max(best, 30 + part.length)
    else best = Math.max(best, 20)
  }
  return best
}

export function pickUniqueClientMatch(
  taskText: string,
  clients: ResolvedTaskClient[]
): ResolvedTaskClient | null {
  const scored = clients
    .map((client) => ({ client, score: scoreMatch(taskText, client) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  if (scored[0].score < 20) return null
  if (scored.length === 1) return scored[0].client
  if (scored[0].score > scored[1].score) return scored[0].client
  return null
}

export async function resolveTaskClient(
  supabase: SupabaseClient,
  {
    taskText,
    counselorId,
    branchId,
  }: {
    taskText: string
    counselorId?: string | null
    branchId?: string | null
  }
): Promise<ResolvedTaskClient | null> {
  const tokens = searchTokens(taskText)
  if (tokens.length === 0) return null

  let scopedBranchId = branchId ?? null
  if (!scopedBranchId && counselorId) {
    const { data: assignee } = await supabase
      .from('counselors')
      .select('branch_id')
      .eq('id', counselorId)
      .maybeSingle()
    scopedBranchId = assignee?.branch_id ?? null
  }

  const orFilter = tokens.map((token) => `name.ilike.%${token}%`).join(',')

  let query = supabase
    .from('clients')
    .select('id, name, client_code, counselor_id, branch_id')
    .neq('status', 'removed')
    .or(orFilter)
    .limit(50)

  if (scopedBranchId) {
    query = query.eq('branch_id', scopedBranchId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[resolveTaskClient] search failed:', error.message)
    return null
  }

  const hits = (data ?? []) as Array<
    ResolvedTaskClient & { counselor_id: string | null; branch_id: string | null }
  >

  const own = counselorId ? hits.filter((client) => client.counselor_id === counselorId) : hits
  return pickUniqueClientMatch(taskText, own) ?? pickUniqueClientMatch(taskText, hits)
}
