// /api/files?id=<uuid>
//   PUT    (body = el archivo; cabeceras Content-Type y X-File-Name)  -> { ok: true }
//   GET    -> el archivo (con su Content-Type)        HEAD -> 200 si existe, 404 si no
//   DELETE -> { ok: true }
// Los archivos son del usuario que ha iniciado sesión: nadie más puede verlos.
import { json, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { MAX_FILE, deleteFileData, getFileData, hasFile, isFileId, putFile } from '../../server/files.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'HEAD', 'PUT', 'DELETE'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)
  const id = new URL(request.url).searchParams.get('id')
  if (!isFileId(id)) return json({ error: 'Archivo no válido' }, 400)

  if (request.method === 'HEAD') return new Response(null, { status: (await hasFile(env, user.id, id)) ? 200 : 404 })

  if (request.method === 'GET') {
    const { value, metadata } = await getFileData(env, user.id, id)
    if (!value) return json({ error: 'No existe' }, 404)
    return new Response(value, { headers: { 'Content-Type': metadata?.type || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' } })
  }

  if (request.method === 'DELETE') {
    await deleteFileData(env, user.id, id)
    return json({ ok: true })
  }

  // PUT
  const len = Number(request.headers.get('Content-Length') ?? 0)
  if (len > MAX_FILE) return json({ error: 'El archivo es demasiado grande (máximo 24 MB)' }, 413)
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > MAX_FILE) return json({ error: 'El archivo es demasiado grande (máximo 24 MB)' }, 413)
  let name = ''
  try { name = decodeURIComponent(request.headers.get('X-File-Name') ?? '') } catch { /* sin nombre */ }
  await putFile(env, user.id, id, bytes, { name, type: request.headers.get('Content-Type') ?? '' })
  return json({ ok: true })
}
