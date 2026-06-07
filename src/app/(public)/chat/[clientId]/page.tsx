import { redirect } from 'next/navigation'
import { ChatShell } from '@/components/chat/ChatShell'
import { createAdminClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ clientId: string }>
}

export default async function ChatPage({ params }: Props) {
  const { clientId } = await params
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('name, language')
    .eq('id', clientId)
    .single()

  if (!client) {
    redirect('/')
  }

  return <ChatShell clientId={clientId} clientName={client.name} />
}
