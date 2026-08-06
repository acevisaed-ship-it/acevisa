import nodemailer from 'nodemailer'

const FROM = 'ACE Altius Consulting <noreply@aceyourvisa.com>'

function getTransporter() {
  if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASSWORD) return null
  return nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST ?? 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false, // STARTTLS on 587, not implicit TLS
    auth: {
      user: process.env.SES_SMTP_USER,
      pass: process.env.SES_SMTP_PASSWORD,
    },
  })
}

type SendOptions = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendOptions): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.log('[email] SES_SMTP_USER/SES_SMTP_PASSWORD not set — skipped:', subject)
    return
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
  } catch (err) {
    // Non-fatal — log and continue, same behavior as before
    console.error('[email] send error:', err)
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

function wrap(body: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#E6E8E7;padding:32px;border-radius:16px;color:#0A3F3A">
      ${body}
      <p style="margin-top:40px;font-size:12px;color:#0A3F3A99">ACE Altius Consulting · acevisa.co</p>
    </div>`
}

export function complaintEmailHtml(opts: {
  adminName: string
  clientName: string
  subject: string
  body: string
  complaintId: string
  dashboardUrl: string
}) {
  return wrap(`
    <h2 style="color:#E48328;margin:0 0 16px">New complaint filed</h2>
    <p>Hi ${opts.adminName},</p>
    <p>A new complaint has been submitted and requires review.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;font-weight:bold;width:120px">Client:</td><td>${opts.clientName}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Subject:</td><td>${opts.subject}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">ID:</td><td style="font-family:monospace;font-size:12px">${opts.complaintId.slice(0, 8)}</td></tr>
    </table>
    <blockquote style="background:#fff;border-left:4px solid #E48328;padding:12px 16px;border-radius:0 12px 12px 0;margin:0 0 24px">${opts.body}</blockquote>
    <a href="${opts.dashboardUrl}" style="background:#0A3F3A;color:#B7C733;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold">
      Review complaint →
    </a>`)
}

export function escalationEmailHtml(opts: {
  counselorName: string
  clientName: string
  question: string
  dashboardUrl: string
}) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">Client question needs your input</h2>
    <p>Hi ${opts.counselorName},</p>
    <p><strong>${opts.clientName}</strong> asked something the AI couldn't confidently answer:</p>
    <blockquote style="background:#fff;border-left:4px solid #2083B9;padding:12px 16px;border-radius:0 12px 12px 0;margin:16px 0">
      ${opts.question}
    </blockquote>
    <p>Please respond via the dashboard so the client gets a timely answer.</p>
    <a href="${opts.dashboardUrl}" style="background:#B7C733;color:#0A3F3A;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold">
      Answer on dashboard →
    </a>`)
}

export function studentWelcomeEmailHtml(opts: {
  studentName: string
  clientCode: string
  loginEmail: string
  tempPassword: string
  portalUrl: string
}) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Welcome to ACE Altius, ${opts.studentName}!</h2>
    <p>Your account has been created. Here are your portal login details:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fff;border-radius:12px;overflow:hidden">
      <tr><td style="padding:10px 16px;font-weight:bold;width:140px">Your ID:</td><td style="padding:10px 16px;font-family:monospace;font-weight:bold;color:#E48328">${opts.clientCode}</td></tr>
      <tr><td style="padding:10px 16px;font-weight:bold">Login email:</td><td style="padding:10px 16px">${opts.loginEmail}</td></tr>
      <tr><td style="padding:10px 16px;font-weight:bold">Temporary password:</td><td style="padding:10px 16px;font-family:monospace">${opts.tempPassword}</td></tr>
    </table>
    <p>Please keep your ID handy — your counselor will use it to look up your file quickly. We recommend changing your password after your first login.</p>
    <a href="${opts.portalUrl}" style="background:#0A3F3A;color:#B7C733;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold">
      Go to your portal →
    </a>`)
}

export function meetingBookedEmailHtml(opts: {
  counselorName: string
  clientName: string
  clientPhone: string
  scheduledTime: string
  dashboardUrl: string
}) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">New meeting booked</h2>
    <p>Hi ${opts.counselorName},</p>
    <p>A meeting has been scheduled with one of your clients.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;font-weight:bold;width:120px">Client:</td><td>${opts.clientName}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Phone:</td><td>${opts.clientPhone}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Time (PKT):</td><td style="color:#E48328;font-weight:bold">${opts.scheduledTime}</td></tr>
    </table>
    <a href="${opts.dashboardUrl}" style="background:#0A3F3A;color:#B7C733;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold">
      View on dashboard →
    </a>`)
}
