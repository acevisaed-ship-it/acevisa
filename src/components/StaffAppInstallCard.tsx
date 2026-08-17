'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, Smartphone } from 'lucide-react'
import { PWAInstallButton } from '@/components/PWAInstallButton'
import { cn } from '@/lib/utils'

export const STAFF_INSTALL_PATH = '/install?for=staff'

type Props = {
  className?: string
}

export function StaffAppInstallCard({ className }: Props) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  useEffect(() => {
    const absolute = `${window.location.origin}${STAFF_INSTALL_PATH}`
    setQrUrl(
      `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=${encodeURIComponent(absolute)}`
    )
  }, [])

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 glass-card crisp-on-dark p-5',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {qrUrl && (
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <img
              src={qrUrl}
              alt="QR code to install the ACE Portal app"
              className="h-[100px] w-[100px] rounded-xl border border-white/20 bg-white"
            />
            <p className="text-[10px] text-white/40">Scan on your phone</p>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/10 p-2">
              <Smartphone className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Download the mobile app</p>
              <p className="mt-0.5 text-xs text-white/60">
                Install the ACE Portal on your phone to open your dashboard from the home screen. No App Store needed.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={STAFF_INSTALL_PATH}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-grad-orange px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              Get the app
            </Link>
            <PWAInstallButton className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
