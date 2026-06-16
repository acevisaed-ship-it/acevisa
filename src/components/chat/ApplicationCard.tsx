'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Send } from 'lucide-react'

type Props = { currentStage: number }

const STAGES: Record<number, { label: string; desc: string }> = {
  1: { label: 'Initial Consultation', desc: 'Registered and learning your goals.' },
  2: { label: 'Documents Required',   desc: 'Documents have been identified for your case.' },
  3: { label: 'Documents Submitted',  desc: 'Your documents are under counselor review.' },
  4: { label: 'Application In Progress', desc: 'Your counselor is preparing your application.' },
  5: { label: 'Submitted to Embassy', desc: 'Application submitted — awaiting outcome.' },
  6: { label: 'Approved ✓',           desc: 'Your application has been approved!' },
  7: { label: 'Rejected',             desc: 'Application was not successful. Speak to your counselor.' },
  8: { label: 'Closed',               desc: 'This case has been closed.' },
}

const glassPanel = {
  background: 'rgba(238,238,237,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as React.CSSProperties

const STEP_COUNT = 6

export function ApplicationCard({ currentStage }: Props) {
  const [open, setOpen] = useState(true)
  const info = STAGES[currentStage] ?? STAGES[1]
  // clamp to visual steps 1–6 (stage 6 = approved, 7/8 = edge cases)
  const visualStage = Math.min(currentStage, STEP_COUNT)

  return (
    <div className="rounded-2xl p-3" style={glassPanel}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold text-white">My Application</span>
          <span className="rounded-full bg-blue/20 px-1.5 py-0.5 text-[10px] font-bold text-blue">
            Stage {currentStage}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Stage label + desc */}
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(32,131,185,0.12)', border: '1px solid rgba(32,131,185,0.2)' }}>
            <p className="text-xs font-semibold text-blue">{info.label}</p>
            <p className="mt-0.5 text-[11px] text-white/60">{info.desc}</p>
          </div>

          {/* Visual progress bar */}
          <div className="flex items-center gap-1">
            {Array.from({ length: STEP_COUNT }, (_, i) => {
              const step = i + 1
              const done   = step < visualStage
              const active = step === visualStage
              return (
                <div key={step} className="relative flex flex-1 flex-col items-center gap-1">
                  {/* connector line */}
                  {i < STEP_COUNT - 1 && (
                    <div
                      className="absolute left-1/2 top-2 h-0.5 w-full"
                      style={{ background: done ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)' }}
                    />
                  )}
                  <div className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold transition-all ${
                    done   ? 'bg-green-400 text-[#0A3F3A]' :
                    active ? 'bg-white text-[#0A3F3A] ring-2 ring-white/30' :
                             'bg-white/10 text-white/30'
                  }`}>
                    {done ? '✓' : step}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
