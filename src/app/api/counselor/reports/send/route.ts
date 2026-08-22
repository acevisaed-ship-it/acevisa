import { NextResponse } from 'next/server'
import { sendEmail, counselorProgressReportEmailHtml } from '@/lib/email'
import { logActivity } from '@/lib/activityLog'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import {
  getCounselorProgressReport,
  getReportRecipientEmails,
  type ReportPeriod,
} from '@/lib/reports/getCounselorReport'

const VALID_PERIODS: ReportPeriod[] = ['day', 'week', 'month', 'all']

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { period } = (await request.json()) as { period?: string }
  if (!period || !VALID_PERIODS.includes(period as ReportPeriod)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const report = await getCounselorProgressReport(counselor.id, period as ReportPeriod)
  if (!report) {
    return NextResponse.json({ error: 'Could not build report' }, { status: 500 })
  }

  const recipients = await getReportRecipientEmails(counselor.id)
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'No admin/CEO email on file to send this report to' },
      { status: 400 }
    )
  }

  const html = counselorProgressReportEmailHtml(report)
  const sent = await sendEmail({
    to: recipients,
    subject: `${report.periodLabel} progress report — ${report.counselorName}`,
    html,
  })

  if (!sent) {
    return NextResponse.json({ error: 'Email send failed — check SMTP config' }, { status: 502 })
  }

  await logActivity({
    counselorId: counselor.id,
    actionType: 'progress_report_sent',
    description: `${counselor.name} sent a ${report.periodLabel.toLowerCase()} progress report to leadership`,
    visibility: 'internal',
    metadata: { period, recipients, report },
  })

  return NextResponse.json({ success: true, recipients })
}
