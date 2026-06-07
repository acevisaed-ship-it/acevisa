import { redirect } from 'next/navigation'
import { ScheduleShell } from '@/components/schedule/ScheduleShell'
import { createAdminClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ clientId: string }>
}

export default async function SchedulePage({ params }: Props) {
  const { clientId } = await params
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .single()

  if (!client) {
    redirect('/')
  }

  return <ScheduleShell clientId={clientId} />
}
