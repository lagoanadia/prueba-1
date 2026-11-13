/*
 * ARCHIVOS DEL USUARIO (PDF, fotos…) en Cloudflare KV, para verlos desde cualquier ordenador.
 *   "file:<usuario>:<id>"  -> el archivo (binario) + metadatos { name, type }
 * KV admite valores de hasta 25 MB; ponemos el tope un poco por debajo.
 */
export const MAX_FILE = 24 * 1024 * 1024
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isFileId = (id) => typeof id === 'string' && ID.test(id)
const key = (userId, id) => `file:${userId}:${id}`

export async function putFile(env, userId, id, bytes, meta) {
  await env.DATA.put(key(userId, id), bytes, { metadata: { name: String(meta.name ?? '').slice(0, 200), type: String(meta.type ?? '').slice(0, 100) } })
}
export const getFileData = (env, userId, id) => env.DATA.getWithMetadata(key(userId, id), 'arrayBuffer')
export const deleteFileData = (env, userId, id) => env.DATA.delete(key(userId, id))
export async function hasFile(env, userId, id) {
  const r = await env.DATA.getWithMetadata(key(userId, id), 'stream')
  if (r.value) await r.value.cancel?.()
  return r.value != null
}
