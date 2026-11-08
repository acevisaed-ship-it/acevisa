import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { writeAudit } from '@/lib/ledger/audit'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Reference lists for the Accounts screens: countries, institutions (with partner flag) and agents (with the
 * institutions they are attached to). Reading is open to every admin; changing them needs a head-office admin
 * (not a branch-scoped manager) because these lists are shared by all branches.
 */
export async function GET() {
  const { error } = await requireAccountsApi('full')
  if (error) return error
  const supabase = createAdminClient()
  const [countries, universities, agents, links] = await Promise.all([
    supabase.from('countries').select('id, name').eq('is_active', true).order('name'),
    supabase.from('universities').select('id, name, short_code, is_partner, country_id, is_active').order('name'),
    supabase.from('agents').select('id, name, phone, email, is_active').order('name'),
    supabase.from('agent_institutions').select('agent_id, university_id'),
  ])
  const linkMap = new Map<string, string[]>()
  for (const l of links.data ?? []) linkMap.set(l.agent_id, [...(linkMap.get(l.agent_id) ?? []), l.university_id])
  return NextResponse.json({
    countries: countries.data ?? [],
    institutions: universities.data ?? [],
    agents: (agents.data ?? []).map((a) => ({ ...a, institution_ids: linkMap.get(a.id) ?? [] })),
  })
}

type Body = {
  action?: 'institution.save' | 'agent.save'
  id?: string
  name?: string
  countryId?: string
  shortCode?: string
  isPartner?: boolean
  isActive?: boolean
  phone?: string
  email?: string
  institutionIds?: string[]
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error
  if (isBranchScopedAdmin(admin)) {
    return NextResponse.json({ error: 'Only head-office admins can change institutions and agents' }, { status: 403 })
  }
  const body = (await request.json().catch(() => ({}))) as Body
  const name = (body.name ?? '').trim().slice(0, 160)
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const supabase = createAdminClient()

  if (body.action === 'institution.save') {
    const row = {
      name, country_id: body.countryId || null, short_code: (body.shortCode ?? '').trim().slice(0, 24) || null,
      is_partner: body.isPartner === true, is_active: body.isActive !== false,
    }
    const res = body.id
      ? await supabase.from('universities').update(row).eq('id', body.id).select('id').single()
      : await supabase.from('universities').insert(row).select('id').single()
    if (res.error) {
      console.error('[reference] institution save failed:', res.error)
      return NextResponse.json({ error: res.error.code === '23505' ? 'That institution already exists in this country' : 'Could not save institution' }, { status: 400 })
    }
    await writeAudit({ actorId: admin.id, actorRole: admin.role, entityType: 'institution', entityId: res.data.id, action: body.id ? 'updated' : 'created', after: row })
    return NextResponse.json({ id: res.data.id })
  }

  if (body.action === 'agent.save') {
    const row = { name, phone: body.phone?.trim() || null, email: body.email?.trim() || null, is_active: body.isActive !== false }
    const res = body.id
      ? await supabase.from('agents').update(row).eq('id', body.id).select('id').single()
      : await supabase.from('agents').insert(row).select('id').single()
    if (res.error) {
      console.error('[reference] agent save failed:', res.error)
      return NextResponse.json({ error: res.error.code === '23505' ? 'An agent with that name already exists' : 'Could not save agent' }, { status: 400 })
    }
    const agentId = res.data.id
    await supabase.from('agent_institutions').delete().eq('agent_id', agentId)
    const ids = [...new Set(body.institutionIds ?? [])]
    if (ids.length) await supabase.from('agent_institutions').insert(ids.map((university_id) => ({ agent_id: agentId, university_id })))
    await writeAudit({ actorId: admin.id, actorRole: admin.role, entityType: 'agent', entityId: agentId, action: body.id ? 'updated' : 'created', after: { ...row, institutionIds: ids } })
    return NextResponse.json({ id: agentId })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
