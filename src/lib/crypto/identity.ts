import { createClient } from '@/lib/supabase/client'
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPrivateKey,
  derivePublicFromPrivate,
  deriveBackupKey,
  wrapSecret,
  unwrapSecret,
  base64Encode,
  base64Decode,
} from './e2ee'
import { savePrivateKey, loadPrivateKey, savePublicKey, loadPublicKey } from './key-storage'

const PBKDF2_ITERATIONS = 250_000
const BACKUP_SALT_BYTES = 16
const MIN_PASSPHRASE_LENGTH = 8

export type KeyStatus = 'ready' | 'restore_needed' | 'key_lost'

const inFlightEnsure = new Map<string, Promise<KeyStatus>>()

/**
 * ensureIdentityKeyPair — call once after login.
 *
 * - Local private key present        → 'ready'
 * - No local key, backup exists      → 'restore_needed' (restore via passphrase)
 * - No local key, no backup, but the
 *   server already has a public key  → 'key_lost' (key lives on another device
 *                                        with no backup; never silently overwrite)
 * - Truly new user                   → generates a keypair, stores it locally and
 *                                        upserts the public key → 'ready'
 *
 * Concurrent calls for the same user are serialized so two entry points
 * (navbar + conversation page) can never generate two different keypairs.
 */
export function ensureIdentityKeyPair(userId: string): Promise<KeyStatus> {
  const pending = inFlightEnsure.get(userId)
  if (pending) return pending

  const run = runEnsureIdentityKeyPair(userId).finally(() => {
    inFlightEnsure.delete(userId)
  })
  inFlightEnsure.set(userId, run)
  return run
}

async function runEnsureIdentityKeyPair(userId: string): Promise<KeyStatus> {
  const existing = await loadPrivateKey(userId)
  if (existing) return 'ready'

  const supabase = createClient()

  if (await hasKeyBackup(userId)) return 'restore_needed'

  const { data: existingKey } = await supabase
    .from('user_keys')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existingKey) return 'key_lost'

  const keyPair = await generateKeyPair()
  await savePrivateKey(userId, keyPair.privateKey)
  await savePublicKey(userId, keyPair.publicKey)

  const publicKeyB64 = await exportPublicKey(keyPair.publicKey)
  await supabase.from('user_keys').upsert(
    { user_id: userId, public_key: publicKeyB64 },
    { onConflict: 'user_id' },
  )
  return 'ready'
}

export async function hasKeyBackup(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('key_backups')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function createKeyBackup(userId: string, passphrase: string): Promise<void> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`)
  }

  const privateKey = await loadPrivateKey(userId)
  if (!privateKey) throw new Error('No encryption key to back up')

  const privKeyB64 = await exportPrivateKey(privateKey)
  const salt = crypto.getRandomValues(new Uint8Array(BACKUP_SALT_BYTES))
  const backupKey = await deriveBackupKey(passphrase, salt, PBKDF2_ITERATIONS)
  const { wrapped, iv } = await wrapSecret(privKeyB64, backupKey)

  const supabase = createClient()
  const { error } = await supabase.from('key_backups').upsert(
    {
      user_id: userId,
      wrapped_private_key: wrapped,
      salt: base64Encode(salt.buffer),
      iv,
      iterations: PBKDF2_ITERATIONS,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

export async function restoreKeyBackup(userId: string, passphrase: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('key_backups')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return false

  const backupKey = await deriveBackupKey(
    passphrase,
    new Uint8Array(base64Decode(data.salt)),
    data.iterations,
  )
  const privKeyB64 = await unwrapSecret(data.wrapped_private_key, data.iv, backupKey)
  const privateKey = await importPrivateKey(privKeyB64)
  const publicKey = await derivePublicFromPrivate(privateKey)

  await savePrivateKey(userId, privateKey)
  await savePublicKey(userId, publicKey)
  return true
}

export async function resetIdentityKeyPair(userId: string): Promise<void> {
  const keyPair = await generateKeyPair()
  await savePrivateKey(userId, keyPair.privateKey)
  await savePublicKey(userId, keyPair.publicKey)

  const supabase = createClient()
  const publicKeyB64 = await exportPublicKey(keyPair.publicKey)
  await supabase.from('user_keys').upsert(
    { user_id: userId, public_key: publicKeyB64 },
    { onConflict: 'user_id' },
  )
  await supabase.from('key_backups').delete().eq('user_id', userId)
}

export async function loadMyPrivateKey(userId: string): Promise<CryptoKey | null> {
  return loadPrivateKey(userId)
}

export async function loadMyPublicKey(userId: string): Promise<CryptoKey | null> {
  return loadPublicKey(userId)
}
