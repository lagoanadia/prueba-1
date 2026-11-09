// /api/shares
//   GET                                         -> { items: [...] }  (lo que te han mandado)
//   POST  { to, kind: 'capsule', text, openDate } -> envía una cápsula a un amigo
//   PATCH { id }                                  -> marca como abierta una cápsula recibida
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { findUserId, normalizeUsername } from '../../server/friends.js'
import { listInbox, openItem, sendCapsule } from '../../server/shares.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'POST', 'PATCH'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  if (request.method === 'GET') return json({ items: await listInbox(env, user.id) })
  const body = await readJson(request)
  if (request.method === 'PATCH') {
    const error = await openItem(env, user.id, String(body?.id ?? ''))
    return error ? json({ error }, 400) : json({ items: await listInbox(env, user.id) })
  }
  if (body?.kind !== 'capsule') return json({ error: 'Tipo no válido' }, 400)
  const toId = await findUserId(env, normalizeUsername(body.to))
  if (!toId) return json({ error: 'No hay nadie con ese nombre' }, 404)
  const error = await sendCapsule(env, user.id, toId, body)
  return error ? json({ error }, 400) : json({ ok: true }, 201)
}
