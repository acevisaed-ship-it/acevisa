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

// Roles that get Admin-panel access with UNSCOPED (all-branch) visibility.
// 'admin' (Branch Manager) is scoped to its own branch_id everywhere the app
// applies branch filtering; 'ceo' (Super Admin) has branch_id = NULL and sees everything.
const ADMIN_PANEL_ROLES = ['admin', 'ceo'] as const

export async function getAuthenticatedCounselor() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const admin = createAdminClient()
  const { data: counselor } = await admin
    .from('counselors')
    .select('id, name, email, status, avatar_url, role, branch_id')
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
    .select('id, name, email, status, avatar_url, role, branch_id')
    .eq('email', user.email)
    .single()

  if (!account || account.status !== 'active') return null
  if (!ADMIN_PANEL_ROLES.includes(account.role as (typeof ADMIN_PANEL_ROLES)[number])) return null

  return account
}

export async function requireAdmin() {
  const counselor = await getAuthenticatedCounselor()

  if (!counselor) {
    redirect('/login')
  }

  if (!ADMIN_PANEL_ROLES.includes(counselor.role as (typeof ADMIN_PANEL_ROLES)[number])) {
    redirect(counselor.role === 'receptionist' ? '/receptionist' : '/dashboard')
  }

  return counselor
}

// CEO-only pages (e.g. Branches management). Redirects Branch Managers back to /admin.
export async function requireCeo() {
  const counselor = await requireAdmin()

  if (counselor.role !== 'ceo') {
    redirect('/admin')
  }

  return counselor
}

// True for Branch Managers ('admin') — these accounts should have their data
// filtered to `branch_id = counselor.branch_id`. CEO (branch_id null) sees all.
export function isBranchScoped(counselor: { role: string }) {
  return counselor.role === 'admin'
}

// Page guard for /receptionist — mirrors requireAdmin() but for the receptionist role only.
export async function requireReceptionist() {
  const counselor = await getAuthenticatedCounselor()

  if (!counselor) {
    redirect('/login')
  }

  if (counselor.role !== 'receptionist') {
    redirect(
      ADMIN_PANEL_ROLES.includes(counselor.role as (typeof ADMIN_PANEL_ROLES)[number])
        ? '/admin'
        : '/dashboard'
    )
  }

  return counselor
}
