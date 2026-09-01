import { draftTask, isCeoAgentEnabled } from '@/lib/agentDrafts'
import { computeRetentionRisk } from '@/lib/admin/retentionRisk'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Idea #1 MVP — CEO Agent's daily "presence" run. This is the ONLY thing the
// agent does autonomously right now: it evaluates one narrow, named playbook
// rule and, when the rule fires, writes a DRAFT (never a real task, never a
// notification to the target counselor) via draftTask(). The CEO reviews and
// approves/rejects every draft — see /admin/ceo-agent and
// PATCH /api/agent-drafts/[id].
//
// Gated behind the agent_settings ON/OFF switch — off by default (migration
// 20260902000000_ceo_agent_drafts.sql). Turn it on at /admin/ceo-agent.
//
// Rule implemented: 'retention_risk_review' — flag counselors HR Analytics
// already classifies as high retention risk (computeRetentionRisk — same
// shared function HR Analytics uses, so this can never disagree with what
// the CEO sees on that tab) so the CEO gets a proactive nudge instead of
// having to notice it themselves.
//
// More rules can be added the same way: compute something read-only, call
// draftTask() with a distinct source_rule, and register the new rule in the
// list below. None of them may touch anything but agent_task_drafts.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!(await isCeoAgentEnabled())) {
    return NextResponse.json({ success: true, skipped: 'agent_disabled' })
  }

  const drafted = await runRetentionRiskReview()

  return NextResponse.json({ success: true, rulesRun: ['retention_risk_review'], drafted })
}

async function runRetentionRiskReview() {
  const supabase = createAdminClient()
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
  const startDate = start.slice(0, 10)
  const endDate = end.slice(0, 10)

  const [{ data: counselors }, { data: deals }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, name, created_at')
      .eq('role', 'counselor')
      .eq('status', 'active'),
    supabase
      .from('deals')
      .select('id, counselor_id, deal_value, stage, actual_close_date')
      .in('stage', ['completed', 'agreement_signed'])
      .gte('actual_close_date', startDate)
      .lte('actual_close_date', endDate),
  ])

  const totalRevenue = (deals ?? []).reduce((s, d) => s + Number(d.deal_value), 0)
  let drafted = 0

  for (const c of counselors ?? []) {
    const counselorDeals = (deals ?? []).filter((d) => d.counselor_id === c.id)
    const dealCount = counselorDeals.length
    const revenueGenerated = counselorDeals.reduce((s, d) => s + Number(d.deal_value), 0)
    const businessContributionPct =
      totalRevenue > 0 ? Math.round((revenueGenerated / totalRevenue) * 100) : 0
    const joinedMonthsAgo = Math.floor(
      (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    const risk = computeRetentionRisk(dealCount, businessContributionPct, joinedMonthsAgo)

    if (risk !== 'high') continue

    const result = await draftTask({
      targetCounselorId: null, // for the CEO's own attention, not assigned to the counselor being reviewed
      title: `Retention risk review: ${c.name}`,
      body: `${c.name} has closed 0 deals in ${joinedMonthsAgo} months since joining and is flagged high retention risk in HR Analytics. Consider a check-in.`,
      sourceRule: 'retention_risk_review',
      metadata: { counselorId: c.id, counselorName: c.name, dealCount, joinedMonthsAgo },
      dedupeKey: c.id, // one pending draft per flagged counselor, not one for the whole rule
    })
    if (result.created) drafted++
  }

  return drafted
}
