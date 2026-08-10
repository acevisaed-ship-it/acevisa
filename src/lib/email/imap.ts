import type { EmailConfig } from '@/lib/email/config'
import type { MessageStructureObject } from 'imapflow'
import { simpleParser, type Attachment } from 'mailparser'

export const IMAP_TIMEOUT_MS = 20_000

/** Max bytes embedded as data: URLs for inline CID images (larger ones stay downloadable). */
const MAX_INLINE_DATA_URL_BYTES = 1.5 * 1024 * 1024

export type EmailAttachmentMeta = {
  index: number
  filename: string
  contentType: string
  size: number
  contentId: string | null
  inline: boolean
}

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

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function normalizeCid(raw: string): string {
  let cid = raw.trim()
  try {
    cid = decodeURIComponent(cid)
  } catch {
    // keep raw
  }
  return cid.replace(/^<|>$/g, '').toLowerCase()
}

function rewriteCidImages(html: string, cidMap: Map<string, string>): string {
  if (!html || cidMap.size === 0) return html
  return html.replace(/cid:([^"'\s>]+)/gi, (_match, rawCid: string) => {
    return cidMap.get(normalizeCid(rawCid)) ?? `cid:${rawCid}`
  })
}

function attachmentBuffer(att: Attachment): Buffer | null {
  if (!att.content) return null
  return Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content)
}

function isInlineRelated(att: Attachment): boolean {
  const disposition = (att.contentDisposition ?? '').toLowerCase()
  if (disposition === 'attachment') return false
  if (disposition === 'inline') return true
  // mailparser marks multipart/related parts as related
  return Boolean(att.related && att.contentId)
}

function buildAttachmentMeta(attachments: Attachment[]): EmailAttachmentMeta[] {
  return attachments.map((att, index) => {
    const buf = attachmentBuffer(att)
    const filename =
      att.filename?.trim() ||
      (att.contentType?.startsWith('image/')
        ? `image-${index + 1}.${(att.contentType.split('/')[1] || 'bin').split(';')[0]}`
        : `attachment-${index + 1}`)
    return {
      index,
      filename,
      contentType: att.contentType || 'application/octet-stream',
      size: buf?.length ?? att.size ?? 0,
      contentId: att.contentId ? normalizeCid(att.contentId) : null,
      inline: isInlineRelated(att),
    }
  })
}

async function parseFullMessage(
  client: Awaited<ReturnType<typeof createImapClient>>,
  uid: number,
): Promise<{ text: string; html: string; attachments: Attachment[] }> {
  const { content } = await client.download(String(uid), undefined, { uid: true })
  const raw = await streamToBuffer(content)
  const parsed = await simpleParser(raw)
  return {
    html: typeof parsed.html === 'string' ? parsed.html : '',
    text: parsed.text ?? '',
    attachments: parsed.attachments ?? [],
  }
}

function applyCidRewrites(html: string, attachments: Attachment[]): string {
  const cidMap = new Map<string, string>()
  for (const att of attachments) {
    if (!att.contentId) continue
    const buf = attachmentBuffer(att)
    if (!buf || buf.length === 0) continue
    if (buf.length > MAX_INLINE_DATA_URL_BYTES) continue
    const mime = att.contentType || 'application/octet-stream'
    cidMap.set(normalizeCid(att.contentId), `data:${mime};base64,${buf.toString('base64')}`)
  }
  return rewriteCidImages(html, cidMap)
}

function findBodyParts(structure: MessageStructureObject | undefined) {
  const parts: { text?: string; html?: string } = {}

  function walk(node: MessageStructureObject) {
    const type = (node.type ?? '').toLowerCase()
    if (type === 'text/plain') parts.text = node.part || '1'
    if (type === 'text/html') parts.html = node.part || '1'
    node.childNodes?.forEach(walk)
  }

  if (structure) walk(structure)
  return parts
}

function structureLikelyHasAttachments(structure: MessageStructureObject | undefined): boolean {
  if (!structure) return false
  let found = false
  function walk(node: MessageStructureObject) {
    if (found) return
    const disposition = (node.disposition ?? '').toLowerCase()
    const type = (node.type ?? '').toLowerCase()
    if (disposition === 'attachment' || disposition === 'inline') {
      found = true
      return
    }
    if (node.dispositionParameters?.filename || node.parameters?.name) {
      found = true
      return
    }
    if (type.startsWith('image/') || type.startsWith('application/') || type === 'multipart/related') {
      found = true
      return
    }
    node.childNodes?.forEach(walk)
  }
  walk(structure)
  return found
}

/** Download text/html bodies + attachment metadata. Rewrites cid: images to data URLs. */
export async function downloadMessageBodies(
  client: Awaited<ReturnType<typeof createImapClient>>,
  uid: number,
  structure: MessageStructureObject | undefined,
): Promise<{ text: string; html: string; attachments: EmailAttachmentMeta[] }> {
  const needsFullParse = structureLikelyHasAttachments(structure)

  // Fast path: text-only messages without attachment-looking structure
  if (!needsFullParse) {
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

    if (!html.trim() && !text.trim()) {
      const full = await parseFullMessage(client, uid)
      return {
        text: full.text,
        html: applyCidRewrites(full.html, full.attachments),
        attachments: buildAttachmentMeta(full.attachments),
      }
    }

    if (/cid:/i.test(html)) {
      const full = await parseFullMessage(client, uid)
      return {
        text: text.trim() ? text : full.text,
        html: applyCidRewrites(html || full.html, full.attachments),
        attachments: buildAttachmentMeta(full.attachments),
      }
    }

    return { text, html, attachments: [] }
  }

  // Attachments / related parts present — always full RFC822 parse
  const full = await parseFullMessage(client, uid)
  return {
    text: full.text,
    html: applyCidRewrites(full.html, full.attachments),
    attachments: buildAttachmentMeta(full.attachments),
  }
}

/** Fetch a single attachment by index (from buildAttachmentMeta ordering). */
export async function downloadMessageAttachment(
  client: Awaited<ReturnType<typeof createImapClient>>,
  uid: number,
  index: number,
): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  const full = await parseFullMessage(client, uid)
  const att = full.attachments[index]
  if (!att) return null
  const buf = attachmentBuffer(att)
  if (!buf) return null
  const meta = buildAttachmentMeta(full.attachments)[index]
  return {
    filename: meta.filename,
    contentType: meta.contentType,
    content: buf,
  }
}
