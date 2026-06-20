import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { getEmailConfig } from '@/lib/email/config'

export async function GET(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const config = getEmailConfig()
  if (!config) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const sp = new URL(request.url).searchParams
  const uid = Number(sp.get('uid'))
  const folder = sp.get('folder') ?? 'INBOX'

  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: true,
      auth: { user: config.user, pass: config.password },
      logger: false,
    })

    await client.connect()
    const lock = await client.getMailboxLock(folder)

    let html = ''
    let text = ''
    let subject = ''
    let from = ''
    let date = ''
    let to = ''

    try {
      for await (const msg of client.fetch(String(uid), {
        uid: true,
        envelope: true,
        bodyParts: ['', 'TEXT', 'HTML', '1', '1.1', '1.2'],
      })) {
        const env = msg.envelope
        subject = env.subject ?? '(no subject)'
        from = env.from?.[0]
          ? `${env.from[0].name ?? ''} <${env.from[0].address ?? ''}>`.trim()
          : 'Unknown'
        date = env.date?.toISOString() ?? ''
        to = env.to?.map((t: { name?: string; address?: string }) =>
          `${t.name ?? ''} <${t.address ?? ''}>`.trim()
        ).join(', ') ?? ''

        for (const [, buf] of msg.bodyParts) {
          const str = buf.toString()
          if (str.includes('<html') || str.includes('<body') || str.includes('<div')) {
            html = str
          } else if (!text) {
            text = str
          }
        }
      }

      // Mark as read
      await client.messageFlagsAdd({ uid }, ['\\Seen'])
    } finally {
      lock.release()
    }

    await client.logout()

    return NextResponse.json({ uid, subject, from, to, date, html, text })
  } catch (err) {
    console.error('IMAP fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 })
  }
}
