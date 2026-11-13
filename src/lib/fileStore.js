// Archivos subidos (PDF, imágenes…). Se guardan en este navegador (IndexedDB) para abrirlos al instante
// y también en el servidor (Cloudflare KV), así se ven desde cualquier ordenador con tu sesión.
// Los datos del tablero guardan solo el id del archivo.
const DB = 'organizador-files'
const STORE = 'files'
const SYNCED = 'files-synced' // ids que ya están en el servidor (en este navegador)
const MAX_FILE = 24 * 1024 * 1024 // tope del servidor

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1)
  req.onupgradeneeded = () => req.result.createObjectStore(STORE)
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})
const run = async (mode, fn) => {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const synced = () => { try { return new Set(JSON.parse(localStorage.getItem(SYNCED) ?? '[]')) } catch { return new Set() } }
const markSynced = (id, on = true) => { try { const s = synced(); if (on) s.add(id); else s.delete(id); localStorage.setItem(SYNCED, JSON.stringify([...s])) } catch { /* sin almacenamiento */ } }
const failed = new Set() // no se vuelve a intentar en esta sesión (p. ej. demasiado grande)

/** Sube el archivo al servidor. Devuelve true si queda guardado allí. */
async function upload(id, blob, name) {
  if (!blob || blob.size > MAX_FILE || failed.has(id)) return false
  try {
    const res = await fetch(`/api/files?id=${id}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': blob.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(name ?? blob.name ?? '') }, body: blob })
    if (res.ok) { markSynced(id); return true }
    if (res.status === 413 || res.status === 400) failed.add(id)
  } catch { /* sin conexión: se reintenta después */ }
  return false
}

/** Guarda un archivo (aquí y en el servidor) y devuelve { id, name, type }. */
export async function saveFile(file) {
  const id = crypto.randomUUID()
  await run('readwrite', (s) => s.put(file, id))
  upload(id, file, file.name) // en segundo plano: si falla, se reintenta al volver a abrir la app
  return { id, name: file.name, type: file.type }
}

/** Abre un archivo: del navegador si está; si no (otro ordenador), se baja del servidor y se guarda aquí. */
export async function getFile(id) {
  const local = await run('readonly', (s) => s.get(id)).catch(() => undefined)
  if (local) {
    if (!synced().has(id)) upload(id, local, local.name) // lo que se subió antes de que existiera el servidor
    return local
  }
  try {
    const res = await fetch(`/api/files?id=${id}`, { credentials: 'same-origin' })
    if (!res.ok) return undefined
    const blob = await res.blob()
    run('readwrite', (s) => s.put(blob, id)).catch(() => {})
    markSynced(id)
    return blob
  } catch { return undefined }
}

export async function deleteFile(id) {
  await run('readwrite', (s) => s.delete(id)).catch(() => {})
  markSynced(id, false)
  fetch(`/api/files?id=${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {})
}

/** Sube de una vez lo que haya en este navegador y aún no esté en el servidor (para los archivos de antes). */
export async function syncAllFiles() {
  let keys
  try { keys = await run('readonly', (s) => s.getAllKeys()) } catch { return }
  const done = synced()
  for (const id of keys.filter((k) => !done.has(k))) {
    const blob = await run('readonly', (s) => s.get(id)).catch(() => undefined)
    await upload(id, blob, blob?.name)
  }
}
