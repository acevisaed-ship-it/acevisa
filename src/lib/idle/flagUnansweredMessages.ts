import type { SupabaseClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'

export const UNANSWERED_MESSAGE_HOURS = 2

/**
 * Alert the assigned counselor when a student's latest message has gone
 * unanswered by a human counselor for 2+ hours. AI replies do not count.
 * Deduped per unanswered message so a frequent cron can call this safely.
 */
export async function flagUnansweredMessages(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - UNANSWERED_MESSAGE_HOURS * 60 * 60 * 1000).toISOString()

  const { data: studentMessages } = await supabase
    .from('conversations')
    .select('id, client_id, timestamp, clients(name, counselor_id, pipeline_active)')
    .eq('sender', 'student')
    .lt('timestamp', cutoff)
    .order('timestamp', { ascending: false })

  if (!studentMessages || studentMessages.length === 0) return 0

  const latestByClient = new Map<string, (typeof studentMessages)[number]>()
  for (const m of studentMessages) {
    if (!latestByClient.has(m.client_id)) latestByClient.set(m.client_id, m)
  }

  let alerted = 0
  for (const [clientId, msg] of latestByClient) {
    const { data: laterCounselorReply } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', clientId)
      .eq('sender', 'counselor')
      .gt('timestamp', msg.timestamp)
      .limit(1)
      .maybeSingle()

    if (laterCounselorReply) continue

    const { data: existingAlert } = await supabase
      .from('notifications')
      .select('id')
      .eq('client_id', clientId)
      .eq('type', 'unanswered_message')
      .gt('created_at', msg.timestamp)
      .limit(1)
      .maybeSingle()

    if (existingAlert) continue

    const client = msg.clients as unknown as { name: string; counselor_id: string | null; pipeline_active?: boolean } | null
    if (!client?.counselor_id) continue
    if (client.pipeline_active === false) continue

    await createNotification({
      counselorId: client.counselor_id,
      type: 'unanswered_message',
      title: `${client.name} is still waiting on a reply`,
      body: `Their message has gone unanswered by a counselor for over ${UNANSWERED_MESSAGE_HOURS} hours.`,
      clientId,
    })
    alerted++
  }

  return alerted
}
