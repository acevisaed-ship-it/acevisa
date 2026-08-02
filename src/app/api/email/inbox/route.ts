import { NextResponse } from 'next/server'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getCounselorEmailConfig } from '@/lib/email/config'
import { createImapClient } from '@/lib/email/imap'
import { processDueScheduledEmails } from '@/lib/email/processScheduled'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Flush any "send later" emails that are due (best-effort)
  try {
    await processDueScheduledEmails(counselor.id)
  } catch {
    // ignore — inbox should still load
  }

  const config = await getCounselorEmailConfig()
  if (!config) {
    return NextResponse.json({ connected: false, emails: [], reason: 'no_config' })
  }

  const sp = new URL(request.url).searchParams
  const folder = sp.get('folder') ?? 'INBOX'
  const page = Number(sp.get('page') ?? 1)
  const limit = 30

  try {
    const client = await createImapClient(config)

    await client.connect()
    const lock = await client.getMailboxLock(folder)

    const emails: {
      uid: number
      subject: string
      from: string
      date: string
      seen: boolean
      preview: string
    }[] = []

    try {
      const mailbox = client.mailbox
      const total = typeof mailbox === 'boolean' ? 0 : (mailbox?.exists ?? 0)
      const from = Math.max(1, total - (page * limit) + 1)
      const to = Math.max(1, total - ((page - 1) * limit))

      if (total > 0) {
        for await (const msg of client.fetch(`${from}:${to}`, {
          envelope: true,
          flags: true,
        })) {
          const env = msg.envelope
          if (!env) continue

          emails.push({
            uid: msg.uid,
            subject: env.subject ?? '(no subject)',
            from: env.from?.[0]
              ? `${env.from[0].name ?? ''} <${env.from[0].address ?? ''}>`.trim()
              : 'Unknown',
            date: env.date?.toISOString() ?? new Date().toISOString(),
            seen: msg.flags?.has('\\Seen') ?? false,
            preview: '',
          })
        }
      }
    } finally {
      lock.release()
    }

    await client.logout()

    return NextResponse.json({
      connected: true,
      emails: emails.reverse(),
      folder,
      page,
      connectedAs: config.user,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to mail server'
    console.error('IMAP error:', err)
    return NextResponse.json(
      { connected: false, error: message, emails: [] },
      { status: 500 }
    )
  }
}
