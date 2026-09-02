import { CounselorTasksView } from '@/components/dashboard/CounselorTasksView'

type Props = {
  params: Promise<{ counselorId: string }>
}

export default async function AdminCounselorTasksPage({ params }: Props) {
  const { counselorId } = await params

  return (
    <main className="flex-1 p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-white md:text-3xl">Tasks</h1>
      <CounselorTasksView
        tasksApiUrl={`/api/admin/counselors/${counselorId}/tasks`}
        readOnly
        clientProfileBasePath="/admin/clients"
      />
    </main>
  )
}
