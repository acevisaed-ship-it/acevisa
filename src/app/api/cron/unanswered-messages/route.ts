import { createAdminClient } from '@/lib/supabase/server'
import { flagUnansweredMessages } from '@/lib/idle/flagUnansweredMessages'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const unansweredAlerted = await flagUnansweredMessages(supabase)
  return NextResponse.json({ success: true, unansweredAlerted })
}
