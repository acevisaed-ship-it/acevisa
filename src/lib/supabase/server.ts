import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Component — cookie writes may fail; middleware handles refresh
          }
        },
      },
    }
  )
}

export async function getAuthenticatedCounselor() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const admin = createAdminClient()
  const { data: counselor } = await admin
    .from('counselors')
    .select('id, name, email, status, avatar_url, role')
    .eq('email', user.email)
    .single()

  if (!counselor || counselor.status !== 'active') return null

  return counselor
}

export async function getAuthenticatedAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const admin = createAdminClient()
  const { data: account } = await admin
    .from('counselors')
    .select('id, name, email, status, avatar_url, role')
    .eq('email', user.email)
    .single()

  if (!account || account.status !== 'active' || account.role !== 'admin') return null

  return account
}

export async function requireAdmin() {
  const counselor = await getAuthenticatedCounselor()

  if (!counselor) {
    redirect('/login')
  }

  if (counselor.role !== 'admin') {
    redirect('/dashboard')
  }

  return counselor
}
