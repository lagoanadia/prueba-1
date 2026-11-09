// /api/friends
//   GET                      -> { username, friends: [{ username, avatar }] }
//   PUT    { username }      -> elige tu nombre de usuario
//   POST   { username }      -> añade a un amigo por su nombre
//   DELETE { username }      -> quita a un amigo
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { findUserId, getFriendIds, getUsername, listFriends, normalizeUsername, saveFriendIds, setUsername } from '../../server/friends.js'

const MAX_FRIENDS = 100

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'PUT', 'POST', 'DELETE'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  const state = async () => json({ username: await getUsername(env, user.id), friends: await listFriends(env, user.id) })
  if (request.method === 'GET') return state()

  const username = normalizeUsername((await readJson(request))?.username)
  if (!username) return json({ error: 'Falta el nombre de usuario' }, 400)

  if (request.method === 'PUT') {
    const error = await setUsername(env, user.id, username)
    return error ? json({ error }, 400) : state()
  }

  const friendId = await findUserId(env, username)
  const ids = await getFriendIds(env, user.id)
  if (request.method === 'DELETE') {
    await saveFriendIds(env, user.id, ids.filter((id) => id !== friendId))
    return state()
  }
  // POST: añadir
  if (!friendId) return json({ error: 'No hay nadie con ese nombre' }, 404)
  if (friendId === user.id) return json({ error: 'Ese eres tú' }, 400)
  if (!ids.includes(friendId)) {
    if (ids.length >= MAX_FRIENDS) return json({ error: 'Has llegado al máximo de amigos' }, 400)
    await saveFriendIds(env, user.id, [...ids, friendId])
  }
  return state()
}
