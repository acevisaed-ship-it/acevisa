import { studentContactEmail } from '@/lib/auth/studentAuthEmail'
import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

export type UpdateClientEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string; status: number }

/**
 * Set or change a client's contact email and sync Supabase Auth so they can
 * log in / reset password with that address. Does not store synthetic emails.
 */
export async function updateClientContactEmail(
  supabase: AdminClient,
  opts: { clientId: string; email: string }
): Promise<UpdateClientEmailResult> {
  const email = studentContactEmail(opts.email)
  if (!email) {
    return { ok: false, error: 'Enter a valid email address', status: 400 }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address', status: 400 }
  }

  const { data: client, error: fetchErr } = await supabase
    .from('clients')
    .select('id, email, auth_user_id')
    .eq('id', opts.clientId)
    .maybeSingle()

  if (fetchErr || !client) {
    return { ok: false, error: 'Client not found', status: 404 }
  }

  const current = studentContactEmail(client.email)
  if (current === email) {
    return { ok: true, email }
  }

  const { data: conflict } = await supabase
    .from('clients')
    .select('id, client_code')
    .eq('email', email)
    .neq('id', opts.clientId)
    .maybeSingle()

  if (conflict) {
    return {
      ok: false,
      error: 'That email is already used by another account',
      status: 409,
    }
  }

  if (client.auth_user_id) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(client.auth_user_id, {
      email,
      email_confirm: true,
    })
    if (authErr) {
      console.error('[updateClientContactEmail] auth update failed:', authErr)
      return {
        ok: false,
        error: authErr.message || 'Failed to update login email',
        status: 500,
      }
    }
  }

  const { error: updateErr } = await supabase
    .from('clients')
    .update({ email, updated_at: new Date().toISOString() })
    .eq('id', opts.clientId)

  if (updateErr) {
    console.error('[updateClientContactEmail] db update failed:', updateErr)
    return { ok: false, error: 'Failed to save email', status: 500 }
  }

  return { ok: true, email }
}
