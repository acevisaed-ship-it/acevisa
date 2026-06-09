'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  initialCount: number
  className?: string
}

export function UnassignedCountBadge({ initialCount, className }: Props) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/admin/unassigned-count')
        if (!res.ok) return
        const data = await res.json()
        if (typeof data.count === 'number') setCount(data.count)
      } catch {
        // ignore polling errors
      }
    }

    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (count <= 0) return null

  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white',
        className
      )}
    >
      {count}
    </span>
  )
}
