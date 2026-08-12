'use client'

import { useState } from 'react'
import { AssignTaskButton } from '@/components/admin/AssignTaskButton'
import { CounselorTasksView } from '@/components/dashboard/CounselorTasksView'

type Props = {
  adminId: string
  adminName: string
}

export function AdminMyTasksClient({ adminId, adminName }: Props) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">My Tasks</h1>
        <AssignTaskButton
          targetId={adminId}
          targetName={adminName}
          selfMode
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-text transition-opacity hover:opacity-90"
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      </div>
      <CounselorTasksView key={refreshKey} tasksApiUrl="/api/tasks" />
    </>
  )
}
