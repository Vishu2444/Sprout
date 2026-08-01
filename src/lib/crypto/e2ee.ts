export function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

export function base64Decode(str: string): ArrayBuffer {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer
}

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' }
const AES_PARAMS = { name: 'AES-GCM', length: 256 }

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    ECDH_PARAMS,
    true,
    ['deriveKey', 'deriveBits'],
  ) as Promise<CryptoKeyPair>
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('spki', publicKey)
  return base64Encode(raw)
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    base64Decode(base64),
    ECDH_PARAMS,
    true,
    [],
  )
}

async function deriveAesGcmKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptMessage(
  plaintext: string,
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveAesGcmKey(myPrivateKey, theirPublicKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  )
  return {
    ciphertext: base64Encode(encrypted),
    iv: base64Encode(iv.buffer),
  }
}

export async function decryptMessage(
  ciphertext: string,
  iv: string,
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<string> {
  const key = await deriveAesGcmKey(myPrivateKey, theirPublicKey)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(iv) },
    key,
    base64Decode(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}

// ── Passphrase-based key backup (multi-device recovery) ──

export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('pkcs8', privateKey)
  return base64Encode(raw)
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    base64Decode(base64),
    ECDH_PARAMS,
    true,
    ['deriveKey', 'deriveBits'],
  )
}

export async function derivePublicFromPrivate(privateKey: CryptoKey): Promise<CryptoKey> {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey)
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true },
    ECDH_PARAMS,
    true,
    [],
  )
}

export async function deriveBackupKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function wrapSecret(
  plaintext: string,
  key: CryptoKey,
): Promise<{ wrapped: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { wrapped: base64Encode(encrypted), iv: base64Encode(iv.buffer) }
}

export async function unwrapSecret(
  wrapped: string,
  iv: string,
  key: CryptoKey,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(iv) },
    key,
    base64Decode(wrapped),
  )
  return new TextDecoder().decode(decrypted)
}
