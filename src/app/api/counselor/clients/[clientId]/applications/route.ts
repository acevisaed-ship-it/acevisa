import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor, getAuthenticatedAdmin, isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ clientId: string }> }

async function authorizeForClient(clientId: string) {
  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, counselor_id, branch_id')
    .eq('id', clientId)
    .single()
  if (!client) return { client: null, staff: null, error: NextResponse.json({ error: 'Client not found' }, { status: 404 }) }

  const counselor = await getAuthenticatedCounselor()
  if (counselor?.role === 'counselor') {
    if (counselor.id !== client.counselor_id) {
      return { client: null, staff: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { client, staff: counselor, error: null }
  }

  const admin = await getAuthenticatedAdmin()
  if (admin) {
    if (isBranchScoped(admin) && admin.branch_id !== client.branch_id) {
      return { client: null, staff: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { client, staff: admin, error: null }
  }

  return { client: null, staff: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { clientId } = await params
  const { client, error } = await authorizeForClient(clientId)
  if (error) return error

  const supabase = createAdminClient()
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .eq('client_id', client!.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ applications: applications ?? [] })
}

export async function POST(request: Request, { params }: RouteParams) {
  const { clientId } = await params
  const { client, staff, error } = await authorizeForClient(clientId)
  if (error) return error

  const body = await request.json() as {
    institution_name?: string
    program_name?: string
    country?: string
    status?: string
    submitted_date?: string
  }
  if (!body.institution_name?.trim()) {
    return NextResponse.json({ error: 'Institution name is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: application, error: insertError } = await supabase
    .from('applications')
    .insert({
      client_id: client!.id,
      institution_name: body.institution_name.trim(),
      program_name: body.program_name?.trim() || null,
      country: body.country?.trim() || null,
      status: body.status || 'preparing',
      submitted_date: body.submitted_date || null,
      created_by: staff!.id,
    })
    .select()
    .single()

  if (insertError || !application) {
    console.error('[applications] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }

  await logActivity({
    clientId: client!.id,
    counselorId: staff!.id,
    actorRole: staff!.role,
    actionType: 'application_added',
    description: `${staff!.name} added a new application: ${application.institution_name}${application.program_name ? ` (${application.program_name})` : ''}`,
    metadata: { applicationId: application.id },
  })

  return NextResponse.json({ application })
}
