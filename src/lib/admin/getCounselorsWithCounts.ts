import { createAdminClient } from '@/lib/supabase/server'
import { clientsByCounselorCount } from '@/lib/supabase/relations'
import { isDueTodayOrOverduePKT } from '@/lib/pkt'

export type CounselorWithCounts = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  clientCount: number
  openTaskCount: number
  pendingTodayCount: number
}

export async function getCounselorsWithCounts(branchId?: string | null): Promise<CounselorWithCounts[]> {
  const supabase = createAdminClient()

  let counselorsQuery = supabase
    .from('counselors')
    .select(`id, name, email, phone, role, ${clientsByCounselorCount}`)
    .eq('role', 'counselor')
    .eq('status', 'active')
    .order('name')

  // branchId === undefined → unscoped (CEO). branchId set → Branch Manager's own branch.
  if (branchId) {
    counselorsQuery = counselorsQuery.eq('branch_id', branchId)
  }

  const [{ data: counselors }, { data: pendingTasks }] = await Promise.all([
    counselorsQuery,
    supabase.from('tasks').select('counselor_id, due_date').eq('status', 'pending'),
  ])

  const openTasksByCounselor = new Map<string, number>()
  const pendingTodayByCounselor = new Map<string, number>()
  for (const task of pendingTasks ?? []) {
    if (!task.counselor_id) continue
    openTasksByCounselor.set(
      task.counselor_id,
      (openTasksByCounselor.get(task.counselor_id) ?? 0) + 1
    )
    if (isDueTodayOrOverduePKT(task.due_date)) {
      pendingTodayByCounselor.set(
        task.counselor_id,
        (pendingTodayByCounselor.get(task.counselor_id) ?? 0) + 1
      )
    }
  }

  return (counselors ?? []).map((counselor) => {
    const clientsRelation = counselor.clients as { count: number }[] | { count: number } | null
    const clientCount = Array.isArray(clientsRelation)
      ? (clientsRelation[0]?.count ?? 0)
      : (clientsRelation?.count ?? 0)

    return {
      id: counselor.id,
      name: counselor.name,
      email: counselor.email,
      phone: counselor.phone,
      role: counselor.role,
      clientCount,
      openTaskCount: openTasksByCounselor.get(counselor.id) ?? 0,
      pendingTodayCount: pendingTodayByCounselor.get(counselor.id) ?? 0,
    }
  })
}
