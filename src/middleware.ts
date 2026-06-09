export const runtime = 'nodejs'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session?.user?.email && isProtected) {
    // Enforce "Remember Me = off" — if user didn't choose remember me,
    // require the session-only cookie (dies when browser closes).
    const rememberMe = request.cookies.get('ace_remember')?.value
    const sessionToken = request.cookies.get('ace_session_token')?.value

    if (rememberMe === '0' && !sessionToken) {
      // Browser was closed and reopened — force re-login
      const loginResponse = NextResponse.redirect(new URL('/login', request.url))
      // Clear Supabase auth cookies so the session is truly gone
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith('sb-')) {
          loginResponse.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
        }
      })
      loginResponse.cookies.set('ace_session_token', '', { path: '/', maxAge: 0 })
      return loginResponse
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: account } = await adminClient
      .from('counselors')
      .select('role, status')
      .eq('email', session.user.email)
      .single()

    if (!account || account.status !== 'active') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const isAdmin = account.role === 'admin'

    if (pathname.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/dashboard') && isAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
