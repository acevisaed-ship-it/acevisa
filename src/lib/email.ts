import nodemailer from 'nodemailer'

const FROM = 'ACE Altius Consulting <noreply@aceyourvisa.com>'
const LOGO_URL = 'https://aceyourvisa.com/logo.png'
const PORTAL_URL = 'https://aceyourvisa.com'

function getTransporter() {
  if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASSWORD) return null
  const port = Number(process.env.SES_SMTP_PORT ?? 587)
  return nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST ?? 'email-smtp.us-east-1.amazonaws.com',
    port,
    secure: process.env.SES_SMTP_SECURE
      ? process.env.SES_SMTP_SECURE === 'true'
      : port === 465, // implicit TLS on 465, STARTTLS on 587/others
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

/** Returns true if the message was handed to SMTP successfully. */
export async function sendEmail({ to, subject, html }: SendOptions): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) {
    console.log('[email] SES_SMTP_USER/SES_SMTP_PASSWORD not set — skipped:', subject)
    return false
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
    return true
  } catch (err) {
    // Non-fatal for most callers — log and continue
    console.error('[email] send error:', err)
    return false
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

function wrap(body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#E6E8E7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E6E8E7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(10,63,58,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#0A3F3A;padding:28px 24px;">
              <img src="${LOGO_URL}" alt="ACE Altius Consulting" width="120" style="display:block;border:0;max-width:120px;height:auto;background-color:#ffffff;border-radius:10px;padding:8px 12px;" />
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background-color:#E48328;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;color:#0A3F3A;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F4F5F4;padding:20px 28px;text-align:center;border-top:1px solid #E6E8E7;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0A3F3A;">ACE Altius Consulting</p>
              <p style="margin:0 0 8px;font-size:11px;color:#0A3F3A99;letter-spacing:0.3px;">From Dreams to Destinations</p>
              <p style="margin:0;font-size:11px;">
                <a href="${PORTAL_URL}" style="color:#2083B9;text-decoration:none;">aceyourvisa.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(url: string, label: string, bg = '#0A3F3A', color = '#B7C733') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td style="background-color:${bg};border-radius:24px;">
    <a href="${url}" style="display:inline-block;padding:12px 28px;color:${color};text-decoration:none;font-weight:bold;font-size:14px;">${label}</a>
  </td></tr></table>`
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
    <blockquote style="background:#F4F5F4;border-left:4px solid #E48328;padding:12px 16px;border-radius:0 12px 12px 0;margin:0 0 24px">${opts.body}</blockquote>
    ${ctaButton(opts.dashboardUrl, 'Review complaint →')}`)
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
    <blockquote style="background:#F4F5F4;border-left:4px solid #2083B9;padding:12px 16px;border-radius:0 12px 12px 0;margin:16px 0">
      ${opts.question}
    </blockquote>
    <p>Please respond via the dashboard so the client gets a timely answer.</p>
    ${ctaButton(opts.dashboardUrl, 'Answer on dashboard →', '#B7C733', '#0A3F3A')}`)
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
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F4F5F4;border-radius:12px;overflow:hidden">
      <tr><td style="padding:10px 16px;font-weight:bold;width:140px">Your ID:</td><td style="padding:10px 16px;font-family:monospace;font-weight:bold;color:#E48328">${opts.clientCode}</td></tr>
      <tr><td style="padding:10px 16px;font-weight:bold">Login email:</td><td style="padding:10px 16px">${opts.loginEmail}</td></tr>
      <tr><td style="padding:10px 16px;font-weight:bold">Temporary password:</td><td style="padding:10px 16px;font-family:monospace">${opts.tempPassword}</td></tr>
    </table>
    <p>Please keep your ID handy — your counselor will use it to look up your file quickly. We recommend changing your password after your first login.</p>
    ${ctaButton(opts.portalUrl, 'Go to your portal →')}`)
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
    ${ctaButton(opts.dashboardUrl, 'View on dashboard →')}`)
}

export function meetingConfirmationEmailHtml(opts: {
  clientName: string
  counselorName: string
  whenPKT: string
}) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">You're booked, ${opts.clientName}!</h2>
    <p>Your meeting with <strong>${opts.counselorName}</strong> is confirmed.</p>
    <p style="font-size:18px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:16px;border-radius:12px;margin:16px 0">${opts.whenPKT} PKT</p>
    <p>Your counselor will review your case before the meeting — come with any questions you have.</p>`)
}

export function meetingReminder24hEmailHtml(opts: {
  clientName: string
  counselorName: string
  whenPKT: string
}) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">See you tomorrow, ${opts.clientName}!</h2>
    <p>Reminder — your meeting with <strong>${opts.counselorName}</strong> is:</p>
    <p style="font-size:18px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:16px;border-radius:12px;margin:16px 0">${opts.whenPKT} PKT</p>
    <p>Need to reschedule? Message your counselor directly through the portal.</p>`)
}

export function meetingReminder2hEmailHtml(opts: {
  clientName: string
  counselorName: string
  whenPKT: string
}) {
  return wrap(`
    <h2 style="color:#2083B9;margin:0 0 16px">Almost time, ${opts.clientName}!</h2>
    <p>Your meeting with <strong>${opts.counselorName}</strong> starts in 2 hours:</p>
    <p style="font-size:18px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:16px;border-radius:12px;margin:16px 0">${opts.whenPKT} PKT</p>`)
}

export function counselorWelcomeEmailHtml(opts: {
  name: string
  email: string
  loginUrl: string
}) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Welcome to the team, ${opts.name}!</h2>
    <p>Your ACE Altius Consulting staff account has been created.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F4F5F4;border-radius:12px">
      <tr><td style="padding:10px 16px;font-weight:bold;width:120px">Login email:</td><td style="padding:10px 16px">${opts.email}</td></tr>
    </table>
    <p>Your manager will share your temporary password with you separately. Please change it after your first login.</p>
    ${ctaButton(opts.loginUrl, 'Go to staff login →')}`)
}

export function passwordChangedEmailHtml(opts: { name: string; whenPKT: string }) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Your password was changed</h2>
    <p>Hi ${opts.name},</p>
    <p>This is a confirmation that the password for your ACE Altius Consulting account was changed on ${opts.whenPKT} (Pakistan time).</p>
    <p style="margin-top:16px;font-size:13px;color:#0A3F3A99;">If this wasn't you, please contact us immediately so we can secure your account.</p>`)
}

export function passwordResetEmailHtml(opts: { name: string; resetUrl: string }) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Reset your password</h2>
    <p>Hi ${opts.name},</p>
    <p>We received a request to reset the password for your ACE Altius Consulting student portal account. Click below to choose a new password.</p>
    ${ctaButton(opts.resetUrl, 'Reset password →')}
    <p style="margin-top:24px;font-size:13px;color:#0A3F3A99;">If you didn't request this, you can safely ignore this email — your password won't change.</p>`)
}

export function accountSetupEmailHtml(opts: { name: string; setupUrl: string }) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Set up your portal account</h2>
    <p>Hi ${opts.name},</p>
    <p>You're almost in. Click below to set a password and access your ACE Altius Consulting student portal.</p>
    ${ctaButton(opts.setupUrl, 'Set your password →')}
    <p style="margin-top:24px;font-size:13px;color:#0A3F3A99;">If you didn't expect this email, you can safely ignore it.</p>`)
}

export function documentRequestedEmailHtml(opts: {
  clientName: string
  documentName: string
  portalUrl: string
}) {
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">A document is needed for your application</h2>
    <p>Hi ${opts.clientName},</p>
    <p>Your counselor has requested the following document:</p>
    <p style="font-size:16px;font-weight:bold;color:#E48328;background:#F4F5F4;padding:14px 16px;border-radius:12px;margin:16px 0">${opts.documentName}</p>
    <p>Please upload it through your portal as soon as you're able.</p>
    ${ctaButton(opts.portalUrl, 'Upload document →')}`)
}

export function paymentReceiptEmailHtml(opts: {
  clientName: string
  invoiceNumber: string
  amount: string
  currency: string
  paidAtPKT: string
  lineItems: { description: string; amount: number }[]
}) {
  const rows = opts.lineItems
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.description}</td><td style="padding:6px 0;text-align:right">${i.amount.toLocaleString()}</td></tr>`
    )
    .join('')
  return wrap(`
    <h2 style="color:#0A3F3A;margin:0 0 16px">Payment received — thank you!</h2>
    <p>Hi ${opts.clientName},</p>
    <p>We've received your payment for invoice <strong>${opts.invoiceNumber}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F4F5F4;border-radius:12px;padding:12px">
      ${rows}
      <tr><td style="padding:10px 0 0;font-weight:bold;border-top:1px solid #E6E8E7">Total paid</td><td style="padding:10px 0 0;font-weight:bold;text-align:right;border-top:1px solid #E6E8E7;color:#E48328">${opts.currency} ${opts.amount}</td></tr>
    </table>
    <p style="font-size:13px;color:#0A3F3A99">Paid on ${opts.paidAtPKT}</p>`)
}
