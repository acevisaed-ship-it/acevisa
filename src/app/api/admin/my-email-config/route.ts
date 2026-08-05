import { NextResponse } from 'next/server'
import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('counselor_email_accounts')
    .select('id, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, is_active')
    .eq('counselor_id', admin.id)   // always the caller's own id — never client-supplied
    .maybeSingle()

  return NextResponse.json({ config: data ?? null })
}

export async function POST(req: Request) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const body = await req.json()
  const { email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, app_password, is_active } = body

  if (!email_address || !app_password) {
    return NextResponse.json({ error: 'email_address and app_password are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error: upsertErr } = await supabase
    .from('counselor_email_accounts')
    .upsert(
      {
        counselor_id: admin.id,
        email_address: email_address.trim(),
        display_name: display_name?.trim() || null,
        imap_host: imap_host?.trim() || 'box2422.bluehost.com',
        imap_port: Number(imap_port) || 993,
        smtp_host: smtp_host?.trim() || 'box2422.bluehost.com',
        smtp_port: Number(smtp_port) || 465,
        app_password,
        is_active: is_active !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'counselor_id' }
    )

  if (upsertErr) {
    console.error('[my-email-config] upsert failed:', upsertErr.message)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const supabase = createAdminClient()
  await supabase.from('counselor_email_accounts').delete().eq('counselor_id', admin.id)
  return NextResponse.json({ success: true })
}
