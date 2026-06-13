'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

// Chrome/Android fires this event before showing the install prompt
// Safari/iOS never fires it — we show manual instructions instead
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Detect if already installed as PWA (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    // Android/Chrome: capture install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Already installed — don't show anything
  if (isInstalled) return null

  // Android/Chrome — show native install button
  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt()
          const { outcome } = await deferredPrompt.userChoice
          if (outcome === 'accepted') {
            setDeferredPrompt(null)
            setIsInstalled(true)
          }
        }}
        className={className}
      >
        <Download className="h-4 w-4 shrink-0" />
        Install App
      </button>
    )
  }

  // iOS — show "Add to Home Screen" guide button
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={className}
        >
          <Share className="h-4 w-4 shrink-0" />
          Install on iPhone
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-[20px] bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0A3F3A]">Install ACE Portal</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="flex flex-col gap-4 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A3F3A] text-xs font-bold text-white">1</span>
                  <span>
                    Tap the <strong>Share</strong> button{' '}
                    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      <Share className="mr-1 h-3 w-3" /> Share
                    </span>{' '}
                    at the bottom of Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A3F3A] text-xs font-bold text-white">2</span>
                  <span>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A3F3A] text-xs font-bold text-white">3</span>
                  <span>
                    Tap <strong>"Add"</strong> — the ACE Portal icon will appear on your home screen
                  </span>
                </li>
              </ol>
              <p className="mt-4 text-xs text-gray-400">
                Works like a native app — no App Store needed.
              </p>
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop or unsupported browser — don't render
  return null
}
