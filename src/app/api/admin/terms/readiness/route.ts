import { requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { checkTermsReadyForInvoice } from '@/lib/invoices/terms'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { error } = await requireAccountsApi('full')
  if (error) return error

  const productId = new URL(request.url).searchParams.get('product_id')
  const supabase = createAdminClient()
  const result = await checkTermsReadyForInvoice(supabase, productId)

  if (!result.ok) {
    return NextResponse.json(
      { ready: false, error: result.error, placeholders: result.placeholders },
      { status: 200 }
    )
  }

  return NextResponse.json({ ready: true, placeholders: [] })
}
