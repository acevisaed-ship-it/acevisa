'use client'

const STAGES = [
  { stage: 1, label: 'Initial Consult' },
  { stage: 2, label: 'Qualified' },
  { stage: 3, label: 'Registered' },
  { stage: 4, label: 'Documents' },
  { stage: 5, label: 'Application' },
  { stage: 6, label: 'Visa' },
  { stage: 7, label: 'Admitted 🎉' },
]

type Props = {
  currentStage: number
}

export function ProgressStrip({ currentStage }: Props) {
  return (
    <div className="flex items-center gap-0 px-4 py-2.5">
      {STAGES.map((s, i) => {
        const done = s.stage < currentStage
        const active = s.stage === currentStage
        const isLast = i === STAGES.length - 1

        return (
          <div key={s.stage} className="flex min-w-0 flex-1 items-center">
            {/* Dot + label */}
            <div className="flex flex-col items-center gap-0.5" title={s.label}>
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  active ? 'scale-125 pulse-orange' : ''
                } ${!done && !active ? 'bg-white/20' : ''}`}
                style={
                  done
                    ? { backgroundColor: '#B7C733' }
                    : active
                    ? { backgroundColor: '#E48328' }
                    : {}
                }
              />
              {active && (
                <span className="hidden whitespace-nowrap text-[9px] font-semibold text-white/90 sm:block">
                  {s.label}
                </span>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className="mx-0.5 h-px flex-1"
                style={{
                  background: done
                    ? 'rgba(183,199,51,0.7)'
                    : 'rgba(255,255,255,0.15)',
                }}
              />
            )}
          </div>
        )
      })}

      {/* Stage name always visible on right */}
      <span className="ml-3 shrink-0 whitespace-nowrap text-[10px] font-medium text-white/60 sm:hidden">
        {STAGES.find((s) => s.stage === currentStage)?.label ?? ''}
      </span>
    </div>
  )
}
