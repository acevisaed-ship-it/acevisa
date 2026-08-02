import { readFileSync } from 'fs'
import { ImapFlow } from 'imapflow'

function loadEnv(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    let key = trimmed.slice(0, i)
    let val = trimmed.slice(i + 1)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

const env = loadEnv('.env.local')
const host = env.EMAIL_HOST
const user = env.EMAIL_USER
const password = env.EMAIL_PASSWORD
const port = Number(env.EMAIL_PORT ?? 993)

if (!host || !user || !password) {
  console.error('Missing EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD in .env.local')
  process.exit(1)
}

console.log(`Connecting to ${host}:${port} as ${user} (password length: ${password.length})`)

const client = new ImapFlow({
  host,
  port,
  secure: true,
  auth: { user, pass: password },
  logger: false,
})

try {
  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  const total = typeof client.mailbox === 'object' ? (client.mailbox?.exists ?? 0) : 0
  lock.release()
  await client.logout()
  console.log(`SUCCESS: INBOX has ${total} message(s)`)
} catch (err) {
  console.error('FAILED:', err.message)
  process.exit(1)
}
