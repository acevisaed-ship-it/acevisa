'use client'

import { useEffect, useState } from 'react'

export default function StudentDocumentsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-brand-light p-6">
      <h1 className="text-2xl font-semibold text-brand-dark">Documents</h1>
      <p className="mt-2 text-brand-gray">Document upload — scaffold placeholder</p>
    </main>
  )
}
