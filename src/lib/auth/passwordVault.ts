import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

const VAULT_SALT = 'acevisa-staff-password-vault-v1'

function vaultKey(): Buffer {
  const secret = process.env.PASSWORD_VAULT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Missing PASSWORD_VAULT_KEY / SUPABASE_SERVICE_ROLE_KEY')
  }
  return scryptSync(secret, VAULT_SALT, 32)
}

function encryptStaffPassword(plain: string, counselorId: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', vaultKey(), iv)
  cipher.setAAD(Buffer.from(counselorId, 'utf8'))
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.')
}

function decryptStaffPassword(blob: string, counselorId: string): string | null {
  try {
    const [ivB64, tagB64, encB64] = blob.split('.')
    if (!ivB64 || !tagB64 || !encB64) return null
    const decipher = createDecipheriv(
      'aes-256-gcm',
      vaultKey(),
      Buffer.from(ivB64, 'base64')
    )
    decipher.setAAD(Buffer.from(counselorId, 'utf8'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(encB64, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}

export async function saveStaffPasswordVault(
  supabase: SupabaseClient,
  counselorId: string,
  password: string
) {
  const ciphertext = encryptStaffPassword(password, counselorId)
  const { error } = await supabase.from('counselor_password_vault').upsert({
    counselor_id: counselorId,
    ciphertext,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('[passwordVault] save failed:', error.message)
}

export async function readStaffPasswordVault(
  supabase: SupabaseClient,
  counselorId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('counselor_password_vault')
    .select('ciphertext')
    .eq('counselor_id', counselorId)
    .maybeSingle()
  if (error) {
    console.error('[passwordVault] read failed:', error.message)
    return null
  }
  if (!data?.ciphertext) return null
  return decryptStaffPassword(data.ciphertext, counselorId)
}

export async function clearStaffPasswordVault(
  supabase: SupabaseClient,
  counselorId: string
) {
  const { error } = await supabase
    .from('counselor_password_vault')
    .delete()
    .eq('counselor_id', counselorId)
  if (error) console.error('[passwordVault] clear failed:', error.message)
}
