import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Props = {
  counselorName: string
}

export function AdminCounselorViewBanner({ counselorName }: Props) {
  return (
    <div
      className="border-l-4 border-orange bg-orange/20 px-4 py-3 md:px-6"
      style={{ borderLeftColor: '#E48328', backgroundColor: 'rgba(228, 131, 40, 0.2)' }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-text">
          Viewing {counselorName}&apos;s dashboard — Admin view
        </p>
        <Link
          href="/admin/counselors"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-blue hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to counselors
        </Link>
      </div>
    </div>
  )
}
