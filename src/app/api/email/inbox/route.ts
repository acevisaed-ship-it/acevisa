import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { getEmailConfig } from '@/lib/email/config'

export async function GET(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const config = getEmailConfig()
  if (!config) {
    return NextResponse.json({ connected: false, emails: [] })
  }

  const sp = new URL(request.url).searchParams
  const folder = sp.get('folder') ?? 'INBOX'
  const page = Number(sp.get('page') ?? 1)
  const limit = 30

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

    const emails: {
      uid: number
      subject: string
      from: string
      date: string
      seen: boolean
      preview: string
    }[] = []

    try {
      const total = client.mailbox?.exists ?? 0
      const from = Math.max(1, total - (page * limit) + 1)
      const to = Math.max(1, total - ((page - 1) * limit))

      if (total > 0) {
        for await (const msg of client.fetch(`${from}:${to}`, {
          envelope: true,
          flags: true,
          bodyStructure: true,
          bodyParts: ['TEXT'],
        })) {
          const env = msg.envelope
          emails.push({
            uid: msg.uid,
            subject: env.subject ?? '(no subject)',
            from: env.from?.[0]
              ? `${env.from[0].name ?? ''} <${env.from[0].address ?? ''}>`.trim()
              : 'Unknown',
            date: env.date?.toISOString() ?? new Date().toISOString(),
            seen: msg.flags.has('\\Seen'),
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
    })
  } catch (err) {
    console.error('IMAP error:', err)
    return NextResponse.json(
      { connected: false, error: 'Failed to connect to mail server', emails: [] },
      { status: 500 }
    )
  }
}
