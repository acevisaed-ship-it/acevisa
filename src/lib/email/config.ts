export type EmailConfig = {
  host: string
  port: number
  user: string
  password: string
  from: string
}

export function getEmailConfig(): EmailConfig | null {
  const host = process.env.EMAIL_HOST
  const user = process.env.EMAIL_USER
  const password = process.env.EMAIL_PASSWORD

  if (!host || !user || !password) return null

  return {
    host,
    port: Number(process.env.EMAIL_PORT ?? 993),
    user,
    password,
    from: process.env.EMAIL_FROM ?? user,
  }
}
