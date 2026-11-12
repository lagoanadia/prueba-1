// Archivos subidos (PDF, imágenes…). Se guardan en el servidor (para verlos en todos tus dispositivos)
// y una copia en el navegador (IndexedDB) para abrirlos al momento. Los datos del tablero guardan solo el id.
const DB = 'organizador-files'
const STORE = 'files'
const SYNCED = 'files-synced' // ids que ya están en el servidor

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
const local = {
  get: (id) => run('readonly', (s) => s.get(id)).catch(() => undefined),
  put: (id, blob) => run('readwrite', (s) => s.put(blob, id)).catch(() => {}),
  del: (id) => run('readwrite', (s) => s.delete(id)).catch(() => {}),
  keys: () => run('readonly', (s) => s.getAllKeys()).catch(() => []),
}

const readSynced = () => { try { return new Set(JSON.parse(localStorage.getItem(SYNCED)) ?? []) } catch { return new Set() } }
const markSynced = (id, on = true) => {
  const s = readSynced()
  if (on) s.add(id); else s.delete(id)
  try { localStorage.setItem(SYNCED, JSON.stringify([...s])) } catch { /* sin almacenamiento */ }
}
const url = (id, extra = '') => `/api/files?id=${encodeURIComponent(id)}${extra}`

/** Sube el archivo al servidor (si no estaba ya). */
const pending = new Map()
function upload(id, blob) {
  if (readSynced().has(id)) return Promise.resolve()
  if (pending.has(id)) return pending.get(id)
  const p = (async () => {
    const head = await fetch(url(id, '&meta=1'), { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    if (head?.exists) { markSynced(id); return }
    const r = await fetch(url(id), {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': blob.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(blob.name ?? 'archivo') },
      body: blob,
    })
    if (r.ok) markSynced(id)
    else throw new Error((await r.json().catch(() => ({}))).error ?? 'No se ha podido subir el archivo')
  })().finally(() => pending.delete(id))
  pending.set(id, p)
  return p
}

/** Guarda un archivo y devuelve { id, name, type }. Si no hay red, se sube más tarde. */
export async function saveFile(file) {
  const id = crypto.randomUUID()
  await local.put(id, file)
  upload(id, file).catch(() => {}) // en segundo plano; sin red se queda en el navegador y se reintenta al abrir la app
  return { id, name: file.name, type: file.type }
}

/** El archivo: primero la copia del navegador; si no está (otro dispositivo), se descarga del servidor. */
export async function getFile(id) {
  const mine = await local.get(id)
  if (mine) { upload(id, mine).catch(() => {}); return mine }
  const r = await fetch(url(id), { credentials: 'same-origin' })
  if (!r.ok) return undefined
  const blob = await r.blob()
  await local.put(id, blob)
  markSynced(id)
  return blob
}

export async function deleteFile(id) {
  await local.del(id)
  markSynced(id, false)
  await fetch(url(id), { method: 'DELETE', credentials: 'same-origin' }).catch(() => {})
}

/** Al abrir la app: sube lo que se guardó solo en este navegador (archivos de antes o subidos sin red). */
let syncing = false
export async function syncLocalFiles() {
  if (syncing) return
  syncing = true
  try {
    const done = readSynced()
    for (const id of await local.keys()) {
      if (done.has(id)) continue
      const blob = await local.get(id)
      if (blob) await upload(String(id), blob).catch(() => {})
    }
  } finally { syncing = false }
}
