import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import { TransitionProvider } from '@/components/landing/AirplaneTransition'
import { PWARegister } from '@/components/PWARegister'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ACE Altius Consulting — Overseas Education Consultancy',
  description: 'AI-powered overseas education consultancy for Pakistani students',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ACE Portal',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#0A3F3A" />
        {/* interactive-widget=resizes-content: on Chrome/Android the visual viewport
            shrinks when the soft keyboard opens, so dvh units respond and the chat
            input stays above the keyboard (Bug #5 fix) */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text overflow-x-hidden">
        <Script id="js-enabled" strategy="beforeInteractive">
          {`document.documentElement.classList.add('js-enabled')`}
        </Script>
        <PWARegister />
        <TransitionProvider>{children}</TransitionProvider>
      </body>
    </html>
  )
}
