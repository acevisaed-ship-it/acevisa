import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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
    .select('id, name, email, status')
    .eq('email', user.email)
    .single()

  if (!counselor || counselor.status !== 'active') return null

  return counselor
}
