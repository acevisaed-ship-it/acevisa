import { requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  const { error } = await requireAccountsApi('cash')
  if (error) return error

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage.from('receipts').upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) {
    console.error('Receipt upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
