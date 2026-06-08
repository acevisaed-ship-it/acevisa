import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { TaskPanel, type TaskWithClient } from './TaskPanel'

export default async function TasksPage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, task_text, due_date, status, clients(name)')
    .eq('counselor_id', counselor.id)
    .order('due_date', { ascending: true, nullsFirst: false })

  return (
    <main className="flex-1 p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-blue md:text-3xl">Tasks</h1>
      <TaskPanel tasks={(tasks ?? []) as TaskWithClient[]} />
    </main>
  )
}
