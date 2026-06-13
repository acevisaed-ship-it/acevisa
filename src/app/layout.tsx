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
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <Script id="js-enabled" strategy="beforeInteractive">
          {`document.documentElement.classList.add('js-enabled')`}
        </Script>
        <PWARegister />
        <TransitionProvider>{children}</TransitionProvider>
      </body>
    </html>
  )
}
