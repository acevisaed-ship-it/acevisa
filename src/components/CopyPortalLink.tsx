'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export function CopyPortalLink({ clientId }: { clientId: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/portal?clientId=${clientId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Copy client portal link"
      className={`flex min-h-[40px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        copied
          ? 'bg-green/20 text-white'
          : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green" />
          Copied!
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" />
          Copy portal link
        </>
      )}
    </button>
  )
}
