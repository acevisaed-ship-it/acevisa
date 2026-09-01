export const runtime = 'nodejs'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function redirectToLogin(request: NextRequest) {
  const loginResponse = NextResponse.redirect(new URL('/login', request.url))
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith('sb-') ||
      cookie.name === 'ace_session_token' ||
      cookie.name === 'ace_remember'
    ) {
      loginResponse.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
    }
  }
  return loginResponse
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname
  const isApi = pathname.startsWith('/api/')

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

  let user: { email?: string | null } | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Stale/invalid refresh tokens must not crash the portal.
      // Pages go to login; API callers expect JSON, not an HTML redirect.
      if (isApi) return response
      return redirectToLogin(request)
    }
    user = data.user
  } catch {
    if (isApi) return response
    return redirectToLogin(request)
  }

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/receptionist')

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user?.email && isProtected) {
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
      .eq('email', user.email)
      .single()

    if (!account || account.status !== 'active') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 'ceo' (Super Admin) gets full, unscoped access to the same /admin panel as
    // 'admin' (Branch Manager). 'receptionist' gets its own single-purpose area.
    const isAdmin = account.role === 'admin' || account.role === 'ceo'
    const isReceptionist = account.role === 'receptionist'
    const homeForRole = isAdmin ? '/admin' : isReceptionist ? '/receptionist' : '/dashboard'

    if (pathname.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL(homeForRole, request.url))
    }

    if (pathname.startsWith('/receptionist') && !isReceptionist) {
      return NextResponse.redirect(new URL(homeForRole, request.url))
    }

    if (pathname.startsWith('/dashboard') && (isAdmin || isReceptionist)) {
      return NextResponse.redirect(new URL(homeForRole, request.url))
    }
  }

  return response
}

export const config = {
  // Include /api so expired access tokens are refreshed before Route Handlers
  // run. Front desk keeps /receptionist open for hours; without this, register
  // and other receptionist APIs return 401/403 after the JWT expires.
  matcher: ['/dashboard/:path*', '/admin/:path*', '/receptionist/:path*', '/api/:path*'],
}
