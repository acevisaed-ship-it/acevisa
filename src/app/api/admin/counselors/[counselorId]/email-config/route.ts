import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ counselorId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { counselorId } = await params
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('counselor_email_accounts')
    .select('id, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, is_active')
    .eq('counselor_id', counselorId)
    .maybeSingle()

  // Never return app_password to the client
  return NextResponse.json({ config: data ?? null })
}

export async function POST(req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { counselorId } = await params
  const body = await req.json()
  const {
    email_address,
    display_name,
    imap_host,
    imap_port,
    smtp_host,
    smtp_port,
    app_password,
    is_active,
  } = body

  if (!email_address || !app_password) {
    return NextResponse.json({ error: 'email_address and app_password are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error: upsertErr } = await supabase
    .from('counselor_email_accounts')
    .upsert(
      {
        counselor_id: counselorId,
        email_address: email_address.trim(),
        display_name: display_name?.trim() || null,
        imap_host: imap_host?.trim() || 'mail.bluehost.com',
        imap_port: Number(imap_port) || 993,
        smtp_host: smtp_host?.trim() || 'mail.bluehost.com',
        smtp_port: Number(smtp_port) || 465,
        app_password: app_password,
        is_active: is_active !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'counselor_id' }
    )

  if (upsertErr) {
    console.error('[email-config] upsert failed:', upsertErr.message)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { counselorId } = await params
  const supabase = createAdminClient()

  await supabase
    .from('counselor_email_accounts')
    .delete()
    .eq('counselor_id', counselorId)

  return NextResponse.json({ success: true })
}
