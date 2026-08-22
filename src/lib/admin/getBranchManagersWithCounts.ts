import { createAdminClient } from '@/lib/supabase/server'

export type BranchManagerWithCounts = {
  id: string
  name: string
  email: string
  phone: string | null
  branchName: string | null
  openTaskCount: number
}

export async function getBranchManagersWithCounts(): Promise<BranchManagerWithCounts[]> {
  const supabase = createAdminClient()

  const [{ data: admins }, { data: pendingTasks }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, name, email, phone, branches(name)')
      .eq('role', 'admin')
      .eq('status', 'active')
      .order('name'),
    supabase.from('tasks').select('counselor_id').in('status', ['open', 'in_progress']),
  ])

  const openTasksByStaff = new Map<string, number>()
  for (const task of pendingTasks ?? []) {
    if (!task.counselor_id) continue
    openTasksByStaff.set(task.counselor_id, (openTasksByStaff.get(task.counselor_id) ?? 0) + 1)
  }

  return (admins ?? []).map((a) => {
    const branchRelation = a.branches as { name: string } | { name: string }[] | null
    const branchName = Array.isArray(branchRelation)
      ? (branchRelation[0]?.name ?? null)
      : (branchRelation?.name ?? null)
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      branchName,
      openTaskCount: openTasksByStaff.get(a.id) ?? 0,
    }
  })
}
