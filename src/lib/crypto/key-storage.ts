const DB_NAME = 'sprout-e2ee'
const STORE_NAME = 'private-keys'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getFromStore<T>(db: IDBDatabase, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function putInStore(db: IDBDatabase, value: unknown, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function savePrivateKey(userId: string, key: CryptoKey): Promise<void> {
  const db = await openDb()
  await putInStore(db, key, userId)
  db.close()
}

export async function loadPrivateKey(userId: string): Promise<CryptoKey | null> {
  const db = await openDb()
  const result = await getFromStore<CryptoKey>(db, userId)
  db.close()
  return result ?? null
}

export async function savePublicKey(userId: string, key: CryptoKey): Promise<void> {
  const db = await openDb()
  await putInStore(db, key, `pub:${userId}`)
  db.close()
}

export async function loadPublicKey(userId: string): Promise<CryptoKey | null> {
  const db = await openDb()
  const result = await getFromStore<CryptoKey>(db, `pub:${userId}`)
  db.close()
  return result ?? null
}
