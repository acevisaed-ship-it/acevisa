import { NextResponse } from 'next/server'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getCounselorEmailConfig } from '@/lib/email/config'
import { createImapClient, downloadMessageAttachment } from '@/lib/email/imap'

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
  const index = Number(sp.get('index'))

  if (!uid || Number.isNaN(index) || index < 0) {
    return NextResponse.json({ error: 'uid and index required' }, { status: 400 })
  }

  try {
    const client = await createImapClient(config)
    await client.connect()
    const lock = await client.getMailboxLock(folder)

    let file: { filename: string; contentType: string; content: Buffer } | null = null
    try {
      file = await downloadMessageAttachment(client, uid, index)
    } finally {
      lock.release()
    }

    await client.logout()

    if (!file) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    const safeName = file.filename.replace(/[^\w.\- ()[\]]+/g, '_') || 'attachment'
    return new NextResponse(new Uint8Array(file.content), {
      status: 200,
      headers: {
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Length': String(file.content.length),
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch attachment'
    console.error('IMAP attachment error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
