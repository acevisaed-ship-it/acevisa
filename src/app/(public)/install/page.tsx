'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Share, CheckCircle } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function InstallPageInner() {
  const searchParams = useSearchParams()
  const forStaff = searchParams.get('for') === 'staff'
  const loginHref = forStaff ? '/login' : '/portal/login'
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstalling(false)
    setDeferredPrompt(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A3F3A] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-14 w-auto" />
        </div>

        <div className="rounded-[24px] bg-[#E6E8E7] p-6 shadow-2xl sm:p-8">
          <h1 className="text-center text-2xl font-semibold text-[#0A3F3A]">Install ACE Portal</h1>
          <p className="mt-1 text-center text-sm text-[#0A3F3A]/50">
            {forStaff
              ? 'Open your dashboard from your home screen'
              : 'Track your application from your home screen'}
          </p>

          <div className="mt-6 space-y-3">
            {isInstalled && (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#B7C733]/20 px-4 py-6 text-center">
                <CheckCircle className="h-10 w-10 text-[#B7C733]" />
                <div>
                  <p className="font-semibold text-[#0A3F3A]">App already installed!</p>
                  <p className="mt-1 text-sm text-[#0A3F3A]/60">
                    Open the ACE Portal icon on your home screen.
                  </p>
                </div>
                <a
                  href={loginHref}
                  className="mt-2 inline-flex items-center rounded-full bg-[#0A3F3A] px-5 py-2.5 text-sm font-semibold text-[#E6E8E7]"
                >
                  Open App →
                </a>
              </div>
            )}

            {!isInstalled && deferredPrompt && (
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-[#2083B9]/10 px-4 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2083B9]/20">
                  <Download className="h-7 w-7 text-[#2083B9]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0A3F3A]">Install on Android</p>
                  <p className="mt-1 text-sm text-[#0A3F3A]/60">
                    Tap the button below to add ACE Portal to your home screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  disabled={installing}
                  className="w-full rounded-full bg-[#B7C733] py-3 text-sm font-bold text-[#0A3F3A] disabled:opacity-60"
                >
                  {installing ? 'Installing…' : 'Install App'}
                </button>
              </div>
            )}

            {!isInstalled && isIOS && (
              <div className="rounded-2xl bg-[#0A3F3A]/5 px-4 py-5">
                <p className="mb-4 text-sm font-semibold text-[#0A3F3A]">Install on iPhone / iPad</p>
                <ol className="flex flex-col gap-4 text-sm text-[#0A3F3A]/80">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A3F3A] text-xs font-bold text-white">1</span>
                    <span>
                      Tap the <strong>Share</strong> button{' '}
                      <span className="inline-flex items-center rounded bg-[#0A3F3A]/10 px-1.5 py-0.5 text-xs">
                        <Share className="mr-1 h-3 w-3" /> Share
                      </span>{' '}
                      at the bottom of Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A3F3A] text-xs font-bold text-white">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A3F3A] text-xs font-bold text-white">3</span>
                    <span>Tap <strong>"Add"</strong> — the ACE Portal icon will appear on your home screen</span>
                  </li>
                </ol>
              </div>
            )}

            {!isInstalled && !deferredPrompt && !isIOS && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#2083B9]/10 px-4 py-4">
                  <p className="mb-2 text-sm font-semibold text-[#0A3F3A]">Android (Chrome)</p>
                  <p className="text-sm text-[#0A3F3A]/70">
                    Open this link in Chrome on your Android phone, then tap the install banner or the menu → <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#0A3F3A]/5 px-4 py-4">
                  <p className="mb-2 text-sm font-semibold text-[#0A3F3A]">iPhone / iPad (Safari)</p>
                  <p className="text-sm text-[#0A3F3A]/70">
                    Open this link in Safari, tap the <strong>Share</strong> icon, then tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-[#0A3F3A]/10 pt-4 text-center">
            <p className="text-xs text-[#0A3F3A]/40">
              No App Store required — installs directly from your browser
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{' '}
          <a href={loginHref} className="text-[#B7C733] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default function InstallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A3F3A] text-white/60">
          Loading…
        </div>
      }
    >
      <InstallPageInner />
    </Suspense>
  )
}
