import { createClient } from '@/lib/supabase/client'
import { generateKeyPair, exportPublicKey } from './e2ee'
import { savePrivateKey, loadPrivateKey, savePublicKey, loadPublicKey } from './key-storage'

/**
 * ensureIdentityKeyPair — call once after login.
 * Checks IndexedDB for a stored private key; if missing, generates a new
 * keypair, saves both keys locally, and upserts the exported public key
 * to the user_keys table.
 *
 * Multi-device / key‑backup note:
 * This stores the private key only in IndexedDB on the current device.
 * To support multiple devices later, add a key‑backup mechanism here
 * (e.g. encrypt the private key with a passphrase or device‑specific key
 *  and store the wrapped key in user_keys or a separate backup table).
 */
export async function ensureIdentityKeyPair(userId: string): Promise<void> {
  const existing = await loadPrivateKey(userId)
  if (existing) return

  const keyPair = await generateKeyPair()
  await savePrivateKey(userId, keyPair.privateKey)
  await savePublicKey(userId, keyPair.publicKey)

  const publicKeyB64 = await exportPublicKey(keyPair.publicKey)
  const supabase = createClient()
  await supabase.from('user_keys').upsert(
    { user_id: userId, public_key: publicKeyB64 },
    { onConflict: 'user_id' },
  )
}

export async function loadMyPrivateKey(userId: string): Promise<CryptoKey | null> {
  return loadPrivateKey(userId)
}

export async function loadMyPublicKey(userId: string): Promise<CryptoKey | null> {
  return loadPublicKey(userId)
}
