import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { getTodayPKTDateString, getPKTDayBounds } from '@/lib/pkt'
import { NextResponse } from 'next/server'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Browsable version of the "today's walk-ins" widget — takes a ?date= param
// so reception can look at any past day, and also returns every client
// registered that day (not just walk-ins), since "who came in today" really
// means both.
export async function GET(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const url = new URL(request.url)
  const rawDate = url.searchParams.get('date')
  const date = rawDate && DATE_RE.test(rawDate) ? rawDate : getTodayPKTDateString()
  const { startUTC, endUTC } = getPKTDayBounds(date)

  const supabase = createAdminClient()

  const [walkInsResult, registrationsResult] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('id, client_id, description, created_at, metadata, clients(name, client_code, branch_id)')
      .eq('action_type', 'walk_in')
      .eq('clients.branch_id', receptionist.branch_id)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, client_code, phone, interested_in, target_country, registration_date, ad_source, counselor_id, counselors(name)')
      .eq('branch_id', receptionist.branch_id)
      .gte('registration_date', startUTC)
      .lte('registration_date', endUTC)
      .order('registration_date', { ascending: false }),
  ])

  if (walkInsResult.error) {
    console.error('[receptionist/daily-logs] walk-ins fetch failed:', walkInsResult.error.message)
    return NextResponse.json({ error: 'Failed to load walk-ins' }, { status: 500 })
  }
  if (registrationsResult.error) {
    console.error('[receptionist/daily-logs] registrations fetch failed:', registrationsResult.error.message)
    return NextResponse.json({ error: 'Failed to load registrations' }, { status: 500 })
  }

  const walkIns = (walkInsResult.data ?? [])
    .filter((log) => log.clients)
    .map((log) => {
      const client = log.clients as unknown as { name: string; client_code: string } | null
      const metadata = (log.metadata ?? {}) as { note?: string; loggedByName?: string }
      return {
        id: log.id,
        clientId: log.client_id,
        clientName: client?.name ?? 'Unknown client',
        clientCode: client?.client_code ?? null,
        note: metadata.note ?? null,
        loggedByName: metadata.loggedByName ?? null,
        createdAt: log.created_at,
      }
    })

  const registrations = (registrationsResult.data ?? []).map((c) => {
    const counselor = c.counselors as unknown as { name: string } | null
    return {
      id: c.id,
      name: c.name,
      clientCode: c.client_code,
      phone: c.phone,
      interestedIn: c.interested_in,
      targetCountry: c.target_country,
      registrationDate: c.registration_date,
      adSource: c.ad_source,
      counselorName: counselor?.name ?? null,
    }
  })

  return NextResponse.json({ date, walkIns, registrations })
}
