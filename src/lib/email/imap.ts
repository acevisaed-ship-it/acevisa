import type { EmailConfig } from '@/lib/email/config'
import type { MessageStructureObject } from 'imapflow'
import { simpleParser } from 'mailparser'

export const IMAP_TIMEOUT_MS = 20_000

export async function createImapClient(config: EmailConfig) {
  const { ImapFlow } = await import('imapflow')
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
    connectionTimeout: IMAP_TIMEOUT_MS,
    greetingTimeout: IMAP_TIMEOUT_MS,
    socketTimeout: IMAP_TIMEOUT_MS,
  })
}

function findBodyParts(structure: MessageStructureObject | undefined) {
  const parts: { text?: string; html?: string } = {}

  function walk(node: MessageStructureObject) {
    const type = (node.type ?? '').toLowerCase()
    // Root single-part nodes have no `part` — IMAP still addresses them as "1"
    if (type === 'text/plain') parts.text = node.part || '1'
    if (type === 'text/html') parts.html = node.part || '1'
    node.childNodes?.forEach(walk)
  }

  if (structure) walk(structure)
  return parts
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function rewriteCidImages(html: string, cidMap: Map<string, string>): string {
  if (!html || cidMap.size === 0) return html
  return html.replace(/cid:([^"'\s>]+)/gi, (match, rawCid: string) => {
    const key = rawCid.replace(/^<|>$/g, '').toLowerCase()
    return cidMap.get(key) ?? match
  })
}

/** Download text/html bodies. Falls back to full-message parse when part fetch is empty. */
export async function downloadMessageBodies(
  client: Awaited<ReturnType<typeof createImapClient>>,
  uid: number,
  structure: MessageStructureObject | undefined,
): Promise<{ text: string; html: string }> {
  const { text: textPart, html: htmlPart } = findBodyParts(structure)
  let text = ''
  let html = ''

  try {
    if (htmlPart) {
      const { content } = await client.download(String(uid), htmlPart, { uid: true })
      html = (await streamToBuffer(content)).toString('utf8')
    }

    if (textPart) {
      const { content } = await client.download(String(uid), textPart, { uid: true })
      text = (await streamToBuffer(content)).toString('utf8')
    }
  } catch (err) {
    console.warn('Part download failed, falling back to full source parse:', err)
  }

  // Empty body is common for single-part / oddly structured messages — parse full RFC822
  if (!html.trim() && !text.trim()) {
    const { content } = await client.download(String(uid), undefined, { uid: true })
    const raw = await streamToBuffer(content)
    const parsed = await simpleParser(raw)
    html = typeof parsed.html === 'string' ? parsed.html : ''
    text = parsed.text ?? ''

    const cidMap = new Map<string, string>()
    for (const att of parsed.attachments ?? []) {
      if (!att.contentId || !att.content) continue
      const cid = att.contentId.replace(/^<|>$/g, '').toLowerCase()
      const mime = att.contentType || 'application/octet-stream'
      const b64 = Buffer.isBuffer(att.content)
        ? att.content.toString('base64')
        : Buffer.from(att.content).toString('base64')
      cidMap.set(cid, `data:${mime};base64,${b64}`)
    }
    html = rewriteCidImages(html, cidMap)
  } else if (html.includes('cid:')) {
    // Inline images referenced but we only fetched text parts — parse source for CIDs
    try {
      const { content } = await client.download(String(uid), undefined, { uid: true })
      const raw = await streamToBuffer(content)
      const parsed = await simpleParser(raw)
      const cidMap = new Map<string, string>()
      for (const att of parsed.attachments ?? []) {
        if (!att.contentId || !att.content) continue
        const cid = att.contentId.replace(/^<|>$/g, '').toLowerCase()
        const mime = att.contentType || 'application/octet-stream'
        const b64 = Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : Buffer.from(att.content).toString('base64')
        cidMap.set(cid, `data:${mime};base64,${b64}`)
      }
      html = rewriteCidImages(html, cidMap)
      if (!text.trim() && parsed.text) text = parsed.text
    } catch {
      // Keep partial html/text
    }
  }

  return { text, html }
}
