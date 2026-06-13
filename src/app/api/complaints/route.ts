import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { sendEmail, complaintEmailHtml } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'

export async function GET(request: Request) {
  const clientId = new URL(request.url).searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('name, phone')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json({ name: client.name, phone: client.phone })
}

export async function POST(request: Request) {
  const { clientId, clientName, clientPhone, subject, body } = await request.json()

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Subject and details are required.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  let resolvedName = clientName
  let resolvedPhone = clientPhone
  let counselorId: string | null = null

  if (clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, phone, counselor_id')
      .eq('id', clientId)
      .single()
    if (client) {
      resolvedName = client.name
      resolvedPhone = client.phone
      counselorId = client.counselor_id
    }
  }

  if (!resolvedName?.trim() || !resolvedPhone?.trim()) {
    return NextResponse.json({ error: 'Your name and phone are required.' }, { status: 400 })
  }

  const { data: complaint, error } = await supabase
    .from('complaints')
    .insert({
      client_id: clientId || null,
      client_name: resolvedName.trim(),
      client_phone: resolvedPhone.trim(),
      subject: subject.trim(),
      body: body.trim(),
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Complaint insert error:', error)
    return NextResponse.json({ error: 'Failed to submit complaint.' }, { status: 500 })
  }

  if (clientId) {
    await logActivity({
      clientId,
      actionType: 'complaint_received',
      description: `Student submitted complaint: "${subject}"`,
      metadata: { complaintId: complaint.id },
    })
  }

  if (counselorId) {
    await createNotification({
      counselorId,
      type: 'complaint',
      title: `Complaint received — ${resolvedName || 'Unknown'}`,
      body: subject,
      clientId: clientId || undefined,
    })
  }

  // Email all admins about the new complaint (non-fatal)
  const { data: admins } = await supabase
    .from('counselors')
    .select('email, name')
    .eq('role', 'admin')
    .eq('status', 'active')

  for (const admin of admins ?? []) {
    await sendEmail({
      to: admin.email,
      subject: `New complaint — ${resolvedName}`,
      html: complaintEmailHtml({
        adminName: admin.name,
        clientName: resolvedName,
        subject: subject.trim(),
        body: body.trim(),
        complaintId: complaint.id,
        dashboardUrl: `${getBaseUrl()}/admin/complaints`,
      }),
    })
  }

  return NextResponse.json({ success: true, complaintId: complaint.id })
}
