import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient, isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const status = new URL(request.url).searchParams.get('status') ?? 'pending'
  const allowed = ['pending', 'approved', 'rejected', 'applied', 'cancelled', 'all']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('client_correction_requests')
    .select('*, clients(name, client_code, phone, email)')
    .order('created_at', { ascending: false })
    .limit(80)

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (isBranchScoped(admin) && admin.branch_id) {
    query = query.eq('branch_id', admin.branch_id)
  }

  const { data, error } = await query
  if (error) {
    console.error('[admin/correction-requests] list failed:', error.message)
    return NextResponse.json({ error: 'Failed to load correction requests' }, { status: 500 })
  }

  const staffIds = Array.from(
    new Set(
      (data ?? []).flatMap((row) =>
        [row.requested_by as string | null, row.reviewed_by as string | null].filter(
          (id): id is string => !!id
        )
      )
    )
  )
  const names = new Map<string, string>()
  if (staffIds.length > 0) {
    const { data: staff } = await supabase.from('counselors').select('id, name').in('id', staffIds)
    for (const person of staff ?? []) names.set(person.id, person.name)
  }

  const requests = (data ?? []).map((row) => {
    const client = row.clients as {
      name: string
      client_code: string
      phone: string
      email: string | null
    } | null
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      clientName: client?.name ?? 'Unknown',
      clientCode: client?.client_code ?? '',
      clientPhone: client?.phone ?? '',
      clientEmail: client?.email ?? null,
      requestedByName: names.get(row.requested_by as string) ?? 'Receptionist',
      reviewedByName: row.reviewed_by ? names.get(row.reviewed_by as string) ?? null : null,
      currentValues: (row.current_values ?? {}) as Record<string, string>,
      proposedChanges: (row.proposed_changes ?? {}) as Record<string, string>,
      reason: (row.reason as string | null) ?? null,
      status: row.status as string,
      reviewNote: (row.review_note as string | null) ?? null,
      createdAt: row.created_at as string,
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      appliedAt: (row.applied_at as string | null) ?? null,
    }
  })

  return NextResponse.json({ requests })
}
