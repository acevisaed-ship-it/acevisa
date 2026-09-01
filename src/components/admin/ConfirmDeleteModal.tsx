'use client'

import { X } from 'lucide-react'

export function ConfirmDeleteModal({
  loading,
  onClose,
  onConfirm,
}: {
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-[420px] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="confirm-delete-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="confirm-delete-title" className="text-lg font-bold text-white">
              Delete this entry?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Are you sure you want to delete this entry? This cannot be undone.
            </p>
            <p className="mt-2 text-xs text-white/50">
              The record is archived for audit and will no longer appear in Accounts, P&amp;L, or
              exports.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[52px] flex-1 rounded-full border border-white/20 glass-card py-3 text-sm font-bold text-white/70 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="min-h-[52px] flex-1 rounded-full bg-orange py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
