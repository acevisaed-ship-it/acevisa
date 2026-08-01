'use client'

import { useState } from 'react'
import { AssignTaskModal } from './AssignTaskModal'

type Props = { targetId: string; targetName: string }

export function AssignTaskButton({ targetId, targetName }: Props) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
      >
        Assign Task
      </button>
      {open && (
        <AssignTaskModal
          targetId={targetId}
          targetName={targetName}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false)
            setToast(true)
            setTimeout(() => setToast(false), 3000)
          }}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-grad-blue crisp-on-dark px-5 py-3 text-sm font-medium text-white shadow-lg">
          Task assigned to {targetName}
        </div>
      )}
    </>
  )
}
