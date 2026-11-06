import { logActivity } from '@/lib/activityLog'
import { reminderDue, shouldExpire } from '@/lib/invoices/consentRules'
import { sendConsentReminder } from '@/lib/invoices/issueAndSend'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const now = new Date()
  const { data: pending, error } = await supabase
    .from('invoice_consents')
    .select('id, client_id, status, requested_at, expires_at, reminder_sent_at')
    .eq('status', 'pending')

  if (error) {
    console.error('[cron/invoice-consent-expiry]', error.message)
    return NextResponse.json({ error: 'Failed to load pending consents' }, { status: 500 })
  }

  let reminded = 0
  let expired = 0

  for (const row of pending ?? []) {
    if (
      reminderDue({
        status: 'pending',
        requestedAt: row.requested_at,
        expiresAt: row.expires_at,
        reminderSentAt: row.reminder_sent_at,
        now,
      })
    ) {
      const ok = await sendConsentReminder(supabase, row.id)
      if (ok) {
        reminded += 1
        await logActivity({
          clientId: row.client_id,
          actorRole: 'system',
          actionType: 'invoice_consent_reminded',
          description: 'Terms-acceptance reminder emailed',
          metadata: { entity: 'invoice_consent', entityId: row.id },
        })
      }
    }

    if (shouldExpire({ status: 'pending', expiresAt: row.expires_at, now })) {
      const { error: expireError } = await supabase
        .from('invoice_consents')
        .update({ status: 'expired' })
        .eq('id', row.id)
        .eq('status', 'pending')
      if (!expireError) {
        expired += 1
        await logActivity({
          clientId: row.client_id,
          actorRole: 'system',
          actionType: 'invoice_consent_expired',
          description: 'Terms-acceptance request expired',
          metadata: { entity: 'invoice_consent', entityId: row.id },
        })
      }
    }
  }

  return NextResponse.json({ success: true, reminded, expired })
}
