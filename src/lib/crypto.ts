function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64Decode(str: string): ArrayBuffer {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer
}

function getPrivateKeyStorageKey(userId: string): string {
  return `sprout-e2ee-key-${userId}`
}

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  )

  const [rawPublic, rawPrivate] = await Promise.all([
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  ])

  return {
    publicKey: base64Encode(rawPublic),
    privateKey: base64Encode(rawPrivate),
  }
}

export function storePrivateKey(userId: string, privateKey: string): void {
  localStorage.setItem(getPrivateKeyStorageKey(userId), privateKey)
}

export function getStoredPrivateKey(userId: string): string | null {
  return localStorage.getItem(getPrivateKeyStorageKey(userId))
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    base64Decode(pem),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  )
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    base64Decode(pem),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  )
}

async function deriveSharedSecret(
  privateKeyPem: string,
  publicKeyPem: string,
): Promise<ArrayBuffer> {
  const privateKey = await importPrivateKey(privateKeyPem)
  const publicKey = await importPublicKey(publicKeyPem)
  return crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  )
}

async function sharedKey(
  myPrivateKey: string,
  theirPublicKey: string,
): Promise<CryptoKey> {
  const bits = await deriveSharedSecret(myPrivateKey, theirPublicKey)
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptMessage(
  plaintext: string,
  myPrivateKey: string,
  theirPublicKey: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await sharedKey(myPrivateKey, theirPublicKey)
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
  myPrivateKey: string,
  theirPublicKey: string,
): Promise<string> {
  const key = await sharedKey(myPrivateKey, theirPublicKey)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(iv) },
    key,
    base64Decode(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}
