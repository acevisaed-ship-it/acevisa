import { NextResponse } from 'next/server'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getCounselorEmailConfig } from '@/lib/email/config'
import { createImapClient } from '@/lib/email/imap'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await getCounselorEmailConfig()
  if (!config) {
    return NextResponse.json({ connected: false, unseen: 0, latest: null })
  }

  try {
    const client = await createImapClient(config)
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const uids = await client.search({ unseen: true }, { uid: true })
      const list = Array.isArray(uids) ? uids : []
      const latestUid = list.length > 0 ? Math.max(...list.map(Number)) : 0
      if (!latestUid) {
        return NextResponse.json({ connected: true, unseen: 0, latest: null })
      }

      let latest: { uid: number; subject: string; from: string } | null = null
      for await (const msg of client.fetch(String(latestUid), { envelope: true, uid: true }, { uid: true })) {
        const env = msg.envelope
        const fromAddr = env?.from?.[0]
        latest = {
          uid: msg.uid,
          subject: env?.subject ?? '(no subject)',
          from: fromAddr
            ? `${fromAddr.name || fromAddr.address || 'Unknown'}`.trim()
            : 'Unknown',
        }
      }

      return NextResponse.json({
        connected: true,
        unseen: list.length,
        latest,
      })
    } finally {
      lock.release()
      await client.logout().catch(() => undefined)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to check inbox'
    console.error('[email/unseen]', message)
    return NextResponse.json({ connected: false, unseen: 0, latest: null, error: message })
  }
}
