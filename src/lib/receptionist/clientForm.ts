import { updateClientContactEmail } from '@/lib/auth/updateClientEmail'
import { clientCounselorName } from '@/lib/supabase/relations'
import type { createAdminClient } from '@/lib/supabase/server'
import { displayLanguage, storeLanguage } from '@/lib/receptionist/intakeOptions'

type AdminClient = ReturnType<typeof createAdminClient>

export const CORRECTABLE_FIELDS = [
  'name',
  'phone',
  'email',
  'city',
  'language',
  'interested_in',
  'target_country',
  'language_test_interest',
] as const

export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number]

export const CORRECTABLE_FIELD_LABELS: Record<CorrectableField, string> = {
  name: 'Full name',
  phone: 'Phone number',
  email: 'Email address',
  city: 'City',
  language: 'Preferred language',
  interested_in: 'Interested in',
  target_country: 'Target country',
  language_test_interest: 'Language test',
}

export type ClientFormSnapshot = {
  id: string
  client_code: string
  name: string
  phone: string
  email: string | null
  city: string | null
  language: string
  interested_in: string | null
  target_country: string | null
  language_test_interest: string | null
  counselor_name: string
  registration_date: string | null
  status: string
  match_reasons?: string[]
}

export type ProposedChanges = Partial<Record<CorrectableField, string>>

const CLIENT_FORM_SELECT = [
  'id',
  'client_code',
  'name',
  'phone',
  'email',
  'city',
  'language',
  'interested_in',
  'target_country',
  'language_test_interest',
  'registration_date',
  'status',
  clientCounselorName,
].join(', ')

type ClientFormRow = {
  id: string
  client_code: string
  name: string
  phone: string
  email: string | null
  city: string | null
  language: string
  interested_in: string | null
  target_country: string | null
  language_test_interest: string | null
  registration_date: string | null
  status: string
  counselors?: { name: string } | { name: string }[] | null
}

function counselorNameFromRow(row: ClientFormRow): string {
  const counselor = Array.isArray(row.counselors) ? row.counselors[0] : row.counselors
  return counselor?.name ?? 'Unassigned'
}

export function toClientFormSnapshot(
  row: ClientFormRow,
  matchReasons: string[] = []
): ClientFormSnapshot {
  return {
    id: row.id,
    client_code: row.client_code,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    language: displayLanguage(row.language),
    interested_in: row.interested_in,
    target_country: row.target_country,
    language_test_interest: row.language_test_interest,
    counselor_name: counselorNameFromRow(row),
    registration_date: row.registration_date,
    status: row.status,
    match_reasons: matchReasons.length > 0 ? matchReasons : undefined,
  }
}

export function snapshotValues(snapshot: ClientFormSnapshot): Record<CorrectableField, string> {
  return {
    name: snapshot.name ?? '',
    phone: snapshot.phone ?? '',
    email: snapshot.email ?? '',
    city: snapshot.city ?? '',
    language: snapshot.language ?? '',
    interested_in: snapshot.interested_in ?? '',
    target_country: snapshot.target_country ?? '',
    language_test_interest: snapshot.language_test_interest ?? '',
  }
}

export function normalizeFieldValue(field: CorrectableField, value: string): string {
  const trimmed = value.trim()
  if (field === 'language') return storeLanguage(trimmed)
  if (field === 'email') return trimmed.toLowerCase()
  return trimmed
}

export function diffProposedChanges(
  current: Record<CorrectableField, string>,
  next: Record<CorrectableField, string>
): ProposedChanges {
  const changes: ProposedChanges = {}
  for (const field of CORRECTABLE_FIELDS) {
    const currentNorm = normalizeFieldValue(field, current[field] ?? '')
    const nextNorm = normalizeFieldValue(field, next[field] ?? '')
    if (currentNorm !== nextNorm) {
      changes[field] = next[field].trim()
    }
  }
  return changes
}

export function isCorrectableField(value: string): value is CorrectableField {
  return (CORRECTABLE_FIELDS as readonly string[]).includes(value)
}

export async function loadClientForm(
  supabase: AdminClient,
  opts: { clientId: string; branchId?: string | null }
): Promise<ClientFormSnapshot | null> {
  let query = supabase
    .from('clients')
    .select(CLIENT_FORM_SELECT)
    .eq('id', opts.clientId)
  if (opts.branchId) {
    query = query.eq('branch_id', opts.branchId)
  }
  const { data } = await query.maybeSingle()
  if (!data) return null
  return toClientFormSnapshot(data as unknown as ClientFormRow)
}

export async function findDuplicateClients(
  supabase: AdminClient,
  opts: {
    branchId: string
    excludeClientId?: string
    name?: string | null
    phone?: string | null
    email?: string | null
  }
): Promise<ClientFormSnapshot[]> {
  const reasons = new Map<string, Set<string>>()
  const rows = new Map<string, ClientFormRow>()

  async function collect(column: 'name' | 'phone' | 'email', value: string, reason: string) {
    let query = supabase
      .from('clients')
      .select(CLIENT_FORM_SELECT)
      .eq('branch_id', opts.branchId)
    query = column === 'phone' ? query.eq('phone', value) : query.ilike(column, value)
    const { data } = await query
    for (const row of (data ?? []) as unknown as ClientFormRow[]) {
      if (opts.excludeClientId && row.id === opts.excludeClientId) continue
      rows.set(row.id, row)
      const set = reasons.get(row.id) ?? new Set<string>()
      set.add(reason)
      reasons.set(row.id, set)
    }
  }

  const name = opts.name?.trim()
  const phone = opts.phone?.trim()
  const email = opts.email?.trim()

  if (name) await collect('name', name, 'Same name')
  if (phone) await collect('phone', phone, 'Same phone')
  if (email) await collect('email', email, 'Same email')

  return Array.from(rows.values()).map((row) =>
    toClientFormSnapshot(row, Array.from(reasons.get(row.id) ?? []))
  )
}

export async function applyCorrectableChanges(
  supabase: AdminClient,
  opts: {
    clientId: string
    changes: ProposedChanges
  }
): Promise<{ ok: true } | { ok: false; error: string; status: number; duplicatePhone?: boolean }> {
  const update: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (opts.changes.name !== undefined) {
    const name = opts.changes.name.trim()
    if (!name) return { ok: false, error: 'Name cannot be empty', status: 400 }
    update.name = name
  }

  if (opts.changes.phone !== undefined) {
    const phone = opts.changes.phone.trim()
    if (!phone) return { ok: false, error: 'Phone cannot be empty', status: 400 }
    const { data: existingByPhone } = await supabase
      .from('clients')
      .select('id, client_code')
      .eq('phone', phone)
      .neq('id', opts.clientId)
      .maybeSingle()
    if (existingByPhone) {
      return {
        ok: false,
        error: `A client with this phone already exists (${existingByPhone.client_code}).`,
        status: 409,
        duplicatePhone: true,
      }
    }
    update.phone = phone
  }

  if (opts.changes.city !== undefined) {
    update.city = opts.changes.city.trim() || null
  }
  if (opts.changes.language !== undefined) {
    const language = storeLanguage(opts.changes.language)
    if (!language) return { ok: false, error: 'Language cannot be empty', status: 400 }
    update.language = language
  }
  if (opts.changes.interested_in !== undefined) {
    update.interested_in = opts.changes.interested_in.trim() || null
  }
  if (opts.changes.target_country !== undefined) {
    update.target_country = opts.changes.target_country.trim() || null
  }
  if (opts.changes.language_test_interest !== undefined) {
    update.language_test_interest = opts.changes.language_test_interest.trim() || null
  }

  const fieldUpdates = Object.keys(update).filter((key) => key !== 'updated_at')
  if (fieldUpdates.length > 0) {
    const { error } = await supabase.from('clients').update(update).eq('id', opts.clientId)
    if (error) {
      console.error('[applyCorrectableChanges] update failed:', error.message)
      return { ok: false, error: 'Failed to save client information', status: 500 }
    }
  }

  if (opts.changes.email !== undefined) {
    const email = opts.changes.email.trim()
    if (!email) {
      const { error } = await supabase
        .from('clients')
        .update({ email: null, updated_at: new Date().toISOString() })
        .eq('id', opts.clientId)
      if (error) {
        return { ok: false, error: 'Failed to clear email', status: 500 }
      }
    } else {
      const result = await updateClientContactEmail(supabase, {
        clientId: opts.clientId,
        email,
      })
      if (!result.ok) {
        return { ok: false, error: result.error, status: result.status }
      }
    }
  }

  return { ok: true }
}

export function formatChangeList(changes: ProposedChanges): string {
  return Object.keys(changes)
    .filter(isCorrectableField)
    .map((field) => CORRECTABLE_FIELD_LABELS[field])
    .join(', ')
}
