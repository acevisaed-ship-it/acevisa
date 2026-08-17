import type { ClientFormSnapshot } from '@/lib/receptionist/clientForm'
import { CORRECTABLE_FIELD_LABELS, type CorrectableField } from '@/lib/receptionist/clientForm'

function display(value: string | null | undefined) {
  return value?.trim() ? value : '—'
}

function formatRegistered(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const ROWS: { field: CorrectableField | 'client_code' | 'counselor_name' | 'status' | 'registration_date'; label: string }[] = [
  { field: 'client_code', label: 'Client ID' },
  { field: 'name', label: CORRECTABLE_FIELD_LABELS.name },
  { field: 'phone', label: CORRECTABLE_FIELD_LABELS.phone },
  { field: 'email', label: CORRECTABLE_FIELD_LABELS.email },
  { field: 'city', label: CORRECTABLE_FIELD_LABELS.city },
  { field: 'language', label: CORRECTABLE_FIELD_LABELS.language },
  { field: 'interested_in', label: CORRECTABLE_FIELD_LABELS.interested_in },
  { field: 'target_country', label: CORRECTABLE_FIELD_LABELS.target_country },
  { field: 'language_test_interest', label: CORRECTABLE_FIELD_LABELS.language_test_interest },
  { field: 'counselor_name', label: 'Counselor' },
  { field: 'status', label: 'Status' },
  { field: 'registration_date', label: 'Registered' },
]

export function ClientInfoForm({
  client,
  title,
}: {
  client: ClientFormSnapshot
  title?: string
}) {
  const values: Record<string, string> = {
    client_code: client.client_code,
    name: client.name,
    phone: client.phone,
    email: client.email ?? '',
    city: client.city ?? '',
    language: client.language,
    interested_in: client.interested_in ?? '',
    target_country: client.target_country ?? '',
    language_test_interest: client.language_test_interest ?? '',
    counselor_name: client.counselor_name,
    status: client.status,
    registration_date: formatRegistered(client.registration_date),
  }

  return (
    <div className="rounded-xl border border-bg/10 bg-bg/5 p-4">
      {title && <p className="mb-3 text-sm font-semibold text-bg">{title}</p>}
      {client.match_reasons && client.match_reasons.length > 0 && (
        <p className="mb-3 text-xs font-medium text-orange">
          Matched on: {client.match_reasons.join(', ')}
        </p>
      )}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROWS.map(({ field, label }) => (
          <div key={field}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-bg/40">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-bg">{display(values[field])}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
