import { notFound } from 'next/navigation'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { CounselorChatLayout } from '@/components/chat/CounselorChatLayout'
import { withReturnParams } from '@/lib/returnLink'
import type { ChatMessage } from '@/types'

type Props = {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ returnTo?: string; returnLabel?: string }>
}

export default async function CounselorChatPage({ params, searchParams }: Props) {
  const { clientId } = await params
  const sp = await searchParams
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, language')
    .eq('id', clientId)
    .eq('counselor_id', counselor.id)
    .single()

  if (!client) notFound()

  const { data: messages } = await supabase
    .from('conversations')
    .select('id, message_text, sender, counselor_name, timestamp, attachment_url, attachment_name, attachment_type')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  return (
    <CounselorChatLayout
      clientId={clientId}
      clientName={client.name}
      counselorId={counselor.id}
      counselorName={counselor.name}
      clientLanguage={client.language ?? null}
      initialMessages={(messages ?? []) as ChatMessage[]}
      backHref={
        sp.returnTo && sp.returnLabel
          ? withReturnParams(`/dashboard/clients/${clientId}`, sp.returnTo, sp.returnLabel)
          : `/dashboard/clients/${clientId}`
      }
    />
  )
}
