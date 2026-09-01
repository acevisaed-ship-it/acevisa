'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function InactiveRequestCountBadge({ className }: Props) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/admin/inactive-requests/count')
        if (!res.ok) return
        const data = await res.json()
        if (typeof data.count === 'number') setCount(data.count)
      } catch {
        // ignore polling errors
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (count <= 0) return null

  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-bold text-white',
        className
      )}
    >
      {count}
    </span>
  )
}
