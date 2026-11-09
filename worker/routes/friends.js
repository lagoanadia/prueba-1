// /api/friends
//   GET                               -> { username, friends, incoming, outgoing }
//   PUT    { username }               -> elige tu nombre de usuario
//   POST   { username }               -> envía una petición de amistad (si él ya te la mandó, sois amigos)
//   PATCH  { username, accept: bool } -> acepta o rechaza una petición recibida
//   DELETE { username }               -> quita al amigo (en los dos lados) o cancela tu petición
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { accept, clearRequests, findUserId, friendsState, getFriendIds, getUsername, normalizeUsername, sendRequest, setUsername, unfriend } from '../../server/friends.js'

const MAX_FRIENDS = 100

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  const state = async (extra = {}) => json({ ...(await friendsState(env, user.id)), ...extra })
  if (request.method === 'GET') return state()

  const body = await readJson(request)
  const username = normalizeUsername(body?.username)
  if (!username) return json({ error: 'Falta el nombre de usuario' }, 400)

  if (request.method === 'PUT') {
    const error = await setUsername(env, user.id, username)
    return error ? json({ error }, 400) : state()
  }

  const otherId = await findUserId(env, username)
  if (!otherId) return json({ error: 'No hay nadie con ese nombre' }, 404)
  if (otherId === user.id) return json({ error: 'Ese eres tú' }, 400)

  if (request.method === 'POST') {
    if (!(await getUsername(env, user.id))) return json({ error: 'Elige antes tu nombre de usuario' }, 400)
    if ((await getFriendIds(env, user.id)).length >= MAX_FRIENDS) return json({ error: 'Has llegado al máximo de amigos' }, 400)
    return state({ result: await sendRequest(env, user.id, otherId) })
  }
  if (request.method === 'PATCH') {
    if (body.accept === true) await accept(env, user.id, otherId)
    else await clearRequests(env, user.id, otherId)
    return state()
  }
  await unfriend(env, user.id, otherId) // DELETE
  return state()
}
