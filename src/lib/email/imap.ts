import type { EmailConfig } from '@/lib/email/config'
import type { MessageStructureObject } from 'imapflow'

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
    if (node.type === 'text/plain' && node.part) parts.text = node.part
    if (node.type === 'text/html' && node.part) parts.html = node.part
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

/** Download text/html body parts for a message UID using BODYSTRUCTURE-aware part IDs. */
export async function downloadMessageBodies(
  client: Awaited<ReturnType<typeof createImapClient>>,
  uid: number,
  structure: MessageStructureObject | undefined,
) {
  const { text: textPart, html: htmlPart } = findBodyParts(structure)
  let text = ''
  let html = ''

  if (htmlPart) {
    const { content } = await client.download(String(uid), htmlPart, { uid: true })
    html = (await streamToBuffer(content)).toString('utf8')
  }

  if (textPart) {
    const { content } = await client.download(String(uid), textPart, { uid: true })
    text = (await streamToBuffer(content)).toString('utf8')
  }

  return { text, html }
}
