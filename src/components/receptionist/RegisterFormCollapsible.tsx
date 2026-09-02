'use client'

import { useState } from 'react'
import { RegisterIcon, ChevronIcon } from '@/components/receptionist/icons'
import { ReceptionistRegisterForm } from '@/components/receptionist/ReceptionistRegisterForm'

/** Lime shell + toggle around the (unmodified) registration form. Closed by
 * default — full intake is a deliberate, occasional action, not something
 * that should occupy screen space every time the front desk loads.
 *
 * The revealed panel is an opaque bg-grad-teal backdrop, not the lime shell
 * itself: ReceptionistRegisterForm's own glass-card-md/glass-input styling
 * was built assuming a dark teal ancestor (that's what makes the frosted
 * look read correctly), so it's given one here rather than recoloring 500
 * lines of an already-working, fairly complex form. */
export function RegisterFormCollapsible() {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-card bg-grad-green text-text crisp">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="register-form-panel"
        className="flex w-full items-center gap-3.5 p-5 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg shadow-sm shadow-black/10">
          <RegisterIcon className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Register a new client</span>
          <span className="mt-0.5 block text-xs text-text/65">
            Full intake — starts their file and pipeline stage.
          </span>
        </span>
        <ChevronIcon
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        // Lime padding stays visible as a frame around the dark panel below
        // — without it, the panel's own bg-grad-teal is identical to the
        // page background and the "card" disappears the moment it opens.
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div id="register-form-panel" className="rounded-2xl bg-grad-teal p-4 shadow-inner shadow-black/20 sm:p-5">
            <ReceptionistRegisterForm />
          </div>
        </div>
      )}
    </div>
  )
}
