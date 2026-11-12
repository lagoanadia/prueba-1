/*
 * ARCHIVOS SUBIDOS (PDF, fotos…) en Cloudflare KV
 *
 * Antes solo se guardaban en el navegador (IndexedDB) y en otro dispositivo solo se veía el nombre.
 * Ahora se guardan también aquí, por usuario:
 *   "file:<usuario>:<id>"      -> primer trozo (con { type, name, size, chunks } como metadatos)
 *   "file:<usuario>:<id>:<n>"  -> trozos siguientes (un valor de KV admite como mucho 25 MB)
 */
const CHUNK = 20 * 1024 * 1024
export const MAX_FILE = 80 * 1024 * 1024 // el cuerpo de una petición al Worker no puede pasar de 100 MB

const key = (userId, id, n = 0) => `file:${userId}:${id}${n ? `:${n}` : ''}`
export const isFileId = (id) => typeof id === 'string' && /^[\w-]{8,64}$/.test(id)

export async function fileMeta(env, userId, id) {
  const { value, metadata } = await env.DATA.getWithMetadata(key(userId, id), 'stream')
  if (!value) return null
  value.cancel?.() // solo queremos saber si existe: no se lee el contenido
  return metadata ?? { chunks: 1 }
}

/** Devuelve { meta, body } o null si no existe. */
export async function readFile(env, userId, id) {
  const first = await env.DATA.getWithMetadata(key(userId, id), 'arrayBuffer')
  if (!first.value) return null
  const meta = first.metadata ?? { type: 'application/octet-stream', chunks: 1 }
  if ((meta.chunks ?? 1) <= 1) return { meta, body: first.value }
  const parts = [new Uint8Array(first.value)]
  for (let n = 1; n < meta.chunks; n++) {
    const part = await env.DATA.get(key(userId, id, n), 'arrayBuffer')
    if (!part) return null
    parts.push(new Uint8Array(part))
  }
  const body = new Uint8Array(parts.reduce((a, p) => a + p.length, 0))
  let at = 0
  for (const p of parts) { body.set(p, at); at += p.length }
  return { meta, body }
}

export async function writeFile(env, userId, id, buffer, { type, name }) {
  const chunks = Math.max(1, Math.ceil(buffer.byteLength / CHUNK))
  for (let n = chunks - 1; n >= 0; n--) {
    const part = buffer.slice(n * CHUNK, (n + 1) * CHUNK)
    // El primero se escribe el último: así nunca hay metadatos apuntando a trozos que aún no existen
    await env.DATA.put(key(userId, id, n), part, n === 0 ? { metadata: { type: String(type).slice(0, 100), name: String(name).slice(0, 200), size: buffer.byteLength, chunks } } : undefined)
  }
}

export async function removeFile(env, userId, id) {
  const meta = await fileMeta(env, userId, id)
  const chunks = meta?.chunks ?? 1
  for (let n = 0; n < chunks; n++) await env.DATA.delete(key(userId, id, n))
}
