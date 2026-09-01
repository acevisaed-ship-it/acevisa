import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/inactive-requests?status=pending — CEO-only review queue
// for counselor-initiated "mark inactive" / "reactivate" requests.
export async function GET(request: Request) {
  const { error } = await requireCeoApi()
  if (error) return error

  const status = new URL(request.url).searchParams.get('status') ?? 'pending'
  const allowed = ['pending', 'approved', 'rejected', 'all']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('client_inactive_requests')
    .select('*, clients(name, client_code)')
    .order('created_at', { ascending: false })
    .limit(80)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error: fetchError } = await query
  if (fetchError) {
    console.error('[admin/inactive-requests] list failed:', fetchError.message)
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 })
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
    const client = row.clients as { name: string; client_code: string } | null
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      clientName: client?.name ?? 'Unknown',
      clientCode: client?.client_code ?? '',
      requestedByName: names.get(row.requested_by as string) ?? 'Staff',
      reviewedByName: row.reviewed_by ? names.get(row.reviewed_by as string) ?? null : null,
      requestedActive: row.requested_active as boolean,
      reason: (row.reason as string | null) ?? null,
      status: row.status as string,
      reviewNote: (row.review_note as string | null) ?? null,
      createdAt: row.created_at as string,
      reviewedAt: (row.reviewed_at as string | null) ?? null,
    }
  })

  return NextResponse.json({ requests })
}
