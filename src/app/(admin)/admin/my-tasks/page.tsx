import { CounselorTasksView } from '@/components/dashboard/CounselorTasksView'

export default function AdminMyTasksPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-white md:text-3xl">My Tasks</h1>
      <CounselorTasksView tasksApiUrl="/api/tasks" />
    </main>
  )
}
