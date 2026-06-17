import { SquareCheck } from 'lucide-react'
import { formatPKTDueDate, isOverdueInPKT } from '@/lib/pkt'

type Props = {
  taskText: string
  dueDate: string | null
}

export function TaskRow({ taskText, dueDate }: Props) {
  const overdue = isOverdueInPKT(dueDate)
  const dueLabel = formatPKTDueDate(dueDate)

  return (
    <div className="flex items-start gap-3 rounded-xl glass-card crisp-on-dark px-4 py-3">
      <SquareCheck className="mt-0.5 h-5 w-5 shrink-0 text-green" />
      <div className="min-w-0 flex-1">
        <p className="text-white">{taskText}</p>
        {dueLabel && (
          <p className={`mt-1 text-sm ${overdue ? 'text-orange' : 'text-white/50'}`}>
            Due {dueLabel}
            {overdue ? ' · overdue' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
