import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { getTodayPKTDateString, getPKTDayBounds } from '@/lib/pkt'
import { NextResponse } from 'next/server'

export async function GET() {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { startUTC, endUTC } = getPKTDayBounds(getTodayPKTDateString())

  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('id, client_id, description, created_at, metadata, clients!inner(name, branch_id)')
    .eq('action_type', 'walk_in')
    .eq('clients.branch_id', receptionist.branch_id)
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[receptionist/walk-ins] fetch failed:', error.message)
    return NextResponse.json({ error: 'Failed to load walk-ins' }, { status: 500 })
  }

  const walkIns = (logs ?? [])
    .filter((log) => log.clients)
    .map((log) => {
      const client = log.clients as unknown as { name: string } | null
      const metadata = (log.metadata ?? {}) as { note?: string }
      return {
        id: log.id,
        clientId: log.client_id,
        clientName: client?.name ?? 'Unknown client',
        note: metadata.note ?? null,
        createdAt: log.created_at,
      }
    })

  return NextResponse.json({ walkIns })
}

export async function POST(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const clientId = body?.clientId as string | undefined
  const note = (body?.note as string | undefined)?.trim() || null

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, branch_id')
    .eq('id', clientId)
    .eq('branch_id', receptionist.branch_id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found in your branch' }, { status: 404 })
  }

  await logActivity({
    clientId: client.id,
    counselorId: receptionist.id,
    actorRole: 'receptionist',
    actionType: 'walk_in',
    description: note
      ? `${client.name} walked into the office — ${note}`
      : `${client.name} walked into the office`,
    visibility: 'internal',
    metadata: { note, loggedByName: receptionist.name },
  })

  return NextResponse.json({ success: true })
}
