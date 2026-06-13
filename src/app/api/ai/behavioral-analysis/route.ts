import { runBehavioralAnalysis } from '@/lib/behavioralAnalysis'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** GET /api/ai/behavioral-analysis?clientId=UUID
 *  Returns all analysis records for a client, newest first.
 */
export async function GET(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = new URL(request.url).searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ai_behavioral_notes')
    .select(
      'id, analyzed_at, message_count, messages_since_last, psychological_read, behavioral_observations, delta_from_last, risk_flags'
    )
    .eq('client_id', clientId)
    .order('analyzed_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Behavioral notes fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
  }

  return NextResponse.json({ notes: data ?? [] })
}

/** POST /api/ai/behavioral-analysis
 *  Body: { clientId: string }
 *  Manually triggers a fresh analysis (ignores the 5-message threshold).
 */
export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await request.json()
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const result = await runBehavioralAnalysis(clientId, /* forceRun */ true)

  return NextResponse.json(result)
}
