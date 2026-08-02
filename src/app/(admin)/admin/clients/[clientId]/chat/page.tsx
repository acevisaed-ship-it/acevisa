import { notFound } from 'next/navigation'
import { createAdminClient, requireAdmin, isBranchScoped } from '@/lib/supabase/server'
import { CounselorChatLayout } from '@/components/chat/CounselorChatLayout'
import type { ChatMessage } from '@/types'

type Props = {
  params: Promise<{ clientId: string }>
}

export default async function AdminClientChatPage({ params }: Props) {
  const { clientId } = await params
  const admin = await requireAdmin()

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, branch_id')
    .eq('id', clientId)
    .single()

  if (!client) notFound()
  if (isBranchScoped(admin) && client.branch_id !== admin.branch_id) notFound()

  const { data: messages } = await supabase
    .from('conversations')
    .select('id, message_text, sender, counselor_name, timestamp, attachment_url, attachment_name, attachment_type')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  return (
    <CounselorChatLayout
      clientId={clientId}
      clientName={client.name}
      counselorId={admin.id}
      counselorName={admin.name}
      initialMessages={(messages ?? []) as ChatMessage[]}
      backHref={`/admin/clients/${clientId}`}
    />
  )
}
