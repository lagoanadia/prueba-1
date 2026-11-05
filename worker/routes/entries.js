// /api/entries
//   GET                         -> { entries }
//   POST   { actions: [...] }   -> { entries }   (lo que el usuario confirmó)
//   PATCH  { id, done }         -> { entries }   (marcar hecha / pendiente)
//   DELETE { id }               -> { entries }
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { listEntries, addEntries, updateEntry, deleteEntry, cleanAction } from '../../server/entries.js'

const MAX_ACTIONS = 10

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'POST', 'PATCH', 'DELETE'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  if (request.method === 'GET') return json({ entries: await listEntries(env, user.id) })

  const body = (await readJson(request)) ?? {}

  if (request.method === 'POST') {
    if (!Array.isArray(body.actions)) return json({ error: 'actions must be an array' }, 400)
    const actions = body.actions.slice(0, MAX_ACTIONS).map(cleanAction).filter(Boolean)
    if (actions.length === 0) return json({ error: 'No valid actions' }, 400)
    return json({ entries: await addEntries(env, user.id, actions) })
  }

  if (typeof body.id !== 'string') return json({ error: 'Missing id' }, 400)
  if (request.method === 'PATCH') {
    if (typeof body.done !== 'boolean') return json({ error: 'done must be boolean' }, 400)
    return json({ entries: await updateEntry(env, user.id, body.id, { done: body.done }) })
  }
  return json({ entries: await deleteEntry(env, user.id, body.id) }) // DELETE
}
