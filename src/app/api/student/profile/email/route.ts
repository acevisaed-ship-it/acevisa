import { updateClientContactEmail } from '@/lib/auth/updateClientEmail'
import { createAdminClient, getAuthenticatedClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const sessionClient = await getAuthenticatedClient()
  if (!sessionClient) {
    return NextResponse.json(
      { error: 'Please sign in to add or update your email' },
      { status: 401 }
    )
  }

  const body = (await request.json()) as { email?: string; clientId?: string }
  if (body.clientId && body.clientId !== sessionClient.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const result = await updateClientContactEmail(supabase, {
    clientId: sessionClient.id,
    email: body.email,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, email: result.email })
}
