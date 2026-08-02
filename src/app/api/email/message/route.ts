import { NextResponse } from 'next/server'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getCounselorEmailConfig } from '@/lib/email/config'
import { createImapClient, downloadMessageBodies } from '@/lib/email/imap'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getCounselorEmailConfig()
  if (!config) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

  const sp = new URL(request.url).searchParams
  const uid = Number(sp.get('uid'))
  const folder = sp.get('folder') ?? 'INBOX'

  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

  try {
    const client = await createImapClient(config)
    await client.connect()
    const lock = await client.getMailboxLock(folder)

    let subject = ''
    let from = ''
    let date = ''
    let to = ''
    let cc = ''
    let html = ''
    let text = ''

    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        envelope: true,
        bodyStructure: true,
      }, { uid: true })

      if (!msg?.envelope) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      const env = msg.envelope
      subject = env.subject ?? '(no subject)'
      from = env.from?.[0]
        ? `${env.from[0].name ?? ''} <${env.from[0].address ?? ''}>`.trim()
        : 'Unknown'
      date = env.date?.toISOString() ?? ''
      to = env.to?.map((t) =>
        `${t.name ?? ''} <${t.address ?? ''}>`.trim()
      ).join(', ') ?? ''
      cc = env.cc?.map((t) =>
        `${t.name ?? ''} <${t.address ?? ''}>`.trim()
      ).join(', ') ?? ''

      const bodies = await downloadMessageBodies(client, uid, msg.bodyStructure)
      html = bodies.html
      text = bodies.text

      try {
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
      } catch {
        // Non-fatal — body still returned
      }
    } finally {
      lock.release()
    }

    await client.logout()

    return NextResponse.json({ uid, subject, from, to, cc, date, html, text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch message'
    console.error('IMAP fetch error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
