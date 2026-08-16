import { sendEmail, passwordChangedEmailHtml } from '@/lib/email'
import { clearStaffPasswordVault } from '@/lib/auth/passwordVault'
import {
  createAdminClient,
  getAuthenticatedClient,
  getAuthenticatedCounselor,
} from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const counselor = await getAuthenticatedCounselor()
  let email: string | null = null
  let name = 'there'

  if (counselor) {
    email = counselor.email
    name = counselor.name
    // Staff changed their own password — any admin-saved copy is now stale.
    await clearStaffPasswordVault(createAdminClient(), counselor.id)
  } else {
    const client = await getAuthenticatedClient()
    if (client?.email) {
      email = client.email
      name = client.name ?? 'there'
    }
  }

  if (email) {
    await sendEmail({
      to: email,
      subject: 'Your password was changed',
      html: passwordChangedEmailHtml({
        name,
        whenPKT: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
      }),
    })
  }

  return NextResponse.json({ success: true })
}
