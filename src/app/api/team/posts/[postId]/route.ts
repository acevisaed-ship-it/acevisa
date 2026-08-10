import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

// DELETE /api/team/posts/[postId] — CEO and Branch Managers (admin) only
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { postId } = await params
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: post, error: fetchError } = await supabase
    .from('team_posts')
    .select('id')
    .eq('id', postId)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('team_posts')
    .delete()
    .eq('id', postId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deletedBy: admin.id })
}
