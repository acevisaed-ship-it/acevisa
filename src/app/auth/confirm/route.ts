import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * PKCE-safe auth confirmation for recovery / invite links.
 * Emails should link here with token_hash + type + next (relative path).
 * Session cookies are written onto the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextRaw = searchParams.get('next') ?? '/'

  // Prevent open redirects — only allow same-origin relative paths
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/'
  const isPortal = next.includes('/portal')

  function failRedirect(reason: string) {
    const fail = new URL(isPortal ? '/portal/login' : '/login', request.url)
    fail.searchParams.set('error', reason)
    return NextResponse.redirect(fail)
  }

  if (!token_hash || !type) {
    return failRedirect('missing_token')
  }

  const redirectTo = new URL(next, request.url)
  const response = NextResponse.redirect(redirectTo)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    console.error('[auth/confirm] verifyOtp failed:', error.message)
    return failRedirect('invalid_or_expired_link')
  }

  return response
}
