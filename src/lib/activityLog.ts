import { createAdminClient } from '@/lib/supabase/server'

export async function logActivity({
  clientId,
  counselorId,
  actionType,
  description,
  metadata = {},
}: {
  clientId: string
  counselorId?: string
  actionType: string
  description: string
  metadata?: Record<string, unknown>
}) {
  const supabase = createAdminClient()
  await supabase.from('student_activity_log').insert({
    client_id: clientId,
    counselor_id: counselorId || null,
    action_type: actionType,
    description,
    metadata,
  })
}
