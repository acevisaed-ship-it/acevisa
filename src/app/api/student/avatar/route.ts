import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  // Identify the calling student via their Supabase auth session
  const serverClient = await createServerClient()
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Look up the client record by email
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image file' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, and WEBP images are allowed' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image must be 2MB or smaller' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // Store under clients/ prefix to separate from counselor avatars
  const filePath = `clients/${client.id}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(filePath)

  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('clients')
    .update({ avatar_url: avatarUrl })
    .eq('id', client.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ avatarUrl })
}
