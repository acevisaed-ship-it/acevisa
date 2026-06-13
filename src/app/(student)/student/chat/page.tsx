import { redirect } from 'next/navigation'
import { ChatShell } from '@/components/chat/ChatShell'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

export default async function StudentChatPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/')

  return (
    <div className="flex h-dvh">
      <StudentSidebar clientId={clientId} />
      {/* pt-14 offsets the fixed StudentSidebar mobile header (h-14 = 56px); removed on lg */}
      <main className="flex flex-1 flex-col overflow-hidden pt-14 lg:pt-0">
        <ChatShell clientId={clientId} clientName={client.name} />
      </main>
    </div>
  )
}
