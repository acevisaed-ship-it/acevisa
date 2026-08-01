/** Disambiguate clients ↔ counselors joins after registered_by FK was added. */
export const clientCounselorName = 'counselors!clients_counselor_id_fkey(name)' as const
export const clientsByCounselorCount = 'clients!clients_counselor_id_fkey(count)' as const
