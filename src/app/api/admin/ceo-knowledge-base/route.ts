import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'ceo-knowledge-base'
const ALLOWED_MIME = new Set(['text/html', 'application/pdf'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const CATEGORIES = ['Country Deck', 'Visa Guidebook'] as const

// GET /api/admin/ceo-knowledge-base — list all documents. CEO only.
export async function GET() {
  const { error } = await requireCeoApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data: documents, error: fetchError } = await supabase
    .from('ceo_knowledge_documents')
    .select('id, title, category, country, description, file_size, mime_type, added_at, is_active')
    .order('category')
    .order('country')
    .order('title')

  if (fetchError) {
    console.error('CEO knowledge base fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }

  return NextResponse.json({ documents: documents ?? [] })
}

// POST /api/admin/ceo-knowledge-base — upload a new document. CEO only.
// multipart/form-data: file, title, category, country?, description?
export async function POST(request: Request) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string | null)?.trim()
  const category = (formData.get('category') as string | null) ?? 'Country Deck'
  const country = (formData.get('country') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!file || !title) {
    return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'Only HTML or PDF files are allowed' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const ext = file.name.split('.').pop() ?? 'html'
  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const storagePath = `${category === 'Visa Guidebook' ? 'guidebooks' : 'country-decks'}/${safeName}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('CEO knowledge base storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: doc, error: insertError } = await supabase
    .from('ceo_knowledge_documents')
    .insert({
      title,
      category,
      country,
      description,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      added_by: admin.id,
    })
    .select('id, title, category, country, description, file_size, mime_type, added_at, is_active')
    .single()

  if (insertError) {
    console.error('CEO knowledge base insert error:', insertError)
    await supabase.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
  }

  return NextResponse.json({ document: doc })
}
