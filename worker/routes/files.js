// /api/files?id=<id>   (archivos subidos: PDF, fotos… para verlos en todos tus dispositivos)
//   GET               -> el archivo (binario) o 404
//   GET  &meta=1      -> { exists }
//   PUT  (binario)    -> { ok: true }   cabeceras: Content-Type, X-File-Name (codificado con encodeURIComponent)
//   DELETE            -> { ok: true }
import { json, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { MAX_FILE, fileMeta, isFileId, readFile, removeFile, writeFile } from '../../server/files.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'PUT', 'DELETE'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  const q = new URL(request.url).searchParams
  const id = q.get('id')
  if (!isFileId(id)) return json({ error: 'Archivo no válido' }, 400)

  if (request.method === 'GET') {
    if (q.get('meta')) return json({ exists: Boolean(await fileMeta(env, user.id, id)) })
    const file = await readFile(env, user.id, id)
    if (!file) return json({ error: 'No existe' }, 404)
    return new Response(file.body, { headers: { 'Content-Type': file.meta.type || 'application/octet-stream', 'Cache-Control': 'private, max-age=31536000, immutable' } })
  }

  if (request.method === 'DELETE') {
    await removeFile(env, user.id, id)
    return json({ ok: true })
  }

  const size = Number(request.headers.get('Content-Length') ?? 0)
  if (size > MAX_FILE) return json({ error: 'El archivo es demasiado grande (máx. 80 MB)' }, 413)
  const buffer = await request.arrayBuffer()
  if (!buffer.byteLength) return json({ error: 'Archivo vacío' }, 400)
  if (buffer.byteLength > MAX_FILE) return json({ error: 'El archivo es demasiado grande (máx. 80 MB)' }, 413)
  let name = 'archivo'
  try { name = decodeURIComponent(request.headers.get('X-File-Name') ?? 'archivo') } catch { /* nombre raro: se queda «archivo» */ }
  await writeFile(env, user.id, id, buffer, { type: request.headers.get('Content-Type') ?? 'application/octet-stream', name })
  return json({ ok: true })
}
