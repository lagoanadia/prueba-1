// Nombres de usuario y amigos, en KV:
//   "username:<nombre>"   -> id del usuario dueño de ese nombre (para buscar por nombre)
//   "username-of:<id>"    -> nombre del usuario (para saber el suyo)
//   "friends:<id>"        -> [ids de sus amigos]
import { getProfile } from './profile.js'

// 3-20 caracteres: minúsculas, números, punto y guion bajo (como en Instagram)
export const USERNAME_RE = /^[a-z0-9._]{3,20}$/
export const normalizeUsername = (u) => (typeof u === 'string' ? u.trim().toLowerCase().replace(/^@/, '') : '')

export const getUsername = (env, userId) => env.DATA.get(`username-of:${userId}`)
export const findUserId = (env, username) => env.DATA.get(`username:${username}`)

/** Reserva un nombre para el usuario. Devuelve un mensaje de error o null si ha ido bien. */
export async function setUsername(env, userId, username) {
  if (!USERNAME_RE.test(username)) return 'De 3 a 20 letras minúsculas, números, punto o guion bajo'
  const owner = await findUserId(env, username)
  if (owner && owner !== userId) return 'Ese nombre ya está cogido'
  const old = await getUsername(env, userId)
  if (old && old !== username) await env.DATA.delete(`username:${old}`) // libera el anterior
  await env.DATA.put(`username:${username}`, userId)
  await env.DATA.put(`username-of:${userId}`, username)
  return null
}

// Listas de ids guardadas en KV como JSON
const getIds = async (env, key) => (await env.DATA.get(key, 'json')) ?? []
const putIds = (env, key, ids) => env.DATA.put(key, JSON.stringify(ids))
const addId = async (env, key, id) => { const ids = await getIds(env, key); if (!ids.includes(id)) await putIds(env, key, [...ids, id]) }
const removeId = async (env, key, id) => { const ids = await getIds(env, key); if (ids.includes(id)) await putIds(env, key, ids.filter((x) => x !== id)) }

//   "friends:<id>"   -> amigos (siempre en los dos sentidos)
//   "req-in:<id>"    -> peticiones recibidas · "req-out:<id>" -> peticiones enviadas
export const getFriendIds = (env, id) => getIds(env, `friends:${id}`)

/** Envía una petición. Si el otro ya me la había enviado, somos amigos directamente. Devuelve 'sent' | 'friends'. */
export async function sendRequest(env, me, other) {
  if ((await getFriendIds(env, me)).includes(other)) return 'friends'
  if ((await getIds(env, `req-in:${me}`)).includes(other)) { await accept(env, me, other); return 'friends' }
  await addId(env, `req-out:${me}`, other)
  await addId(env, `req-in:${other}`, me)
  return 'sent'
}

/** Acepta una petición recibida: amigos en los dos sentidos. */
export async function accept(env, me, other) {
  if (!(await getIds(env, `req-in:${me}`)).includes(other)) return false
  await clearRequests(env, me, other)
  await addId(env, `friends:${me}`, other)
  await addId(env, `friends:${other}`, me)
  return true
}

/** Borra cualquier petición entre los dos (rechazar o cancelar). */
export async function clearRequests(env, a, b) {
  await removeId(env, `req-in:${a}`, b); await removeId(env, `req-out:${b}`, a)
  await removeId(env, `req-in:${b}`, a); await removeId(env, `req-out:${a}`, b)
}

/** Deja de ser amigos (en los dos lados) y borra peticiones pendientes. */
export async function unfriend(env, a, b) {
  await removeId(env, `friends:${a}`, b)
  await removeId(env, `friends:${b}`, a)
  await clearRequests(env, a, b)
}

// Lo único que se comparte de otra persona: su nombre y su avatar
const publicUser = async (env, id) => ({ username: await getUsername(env, id), avatar: (await getProfile(env, id)).avatar })
const publicList = async (env, ids) => (await Promise.all(ids.map((id) => publicUser(env, id)))).filter((u) => u.username)

/** Estado completo para la pantalla de amigos. */
export async function friendsState(env, id) {
  const [friends, incoming, outgoing] = await Promise.all([
    getFriendIds(env, id).then((ids) => publicList(env, ids)),
    getIds(env, `req-in:${id}`).then((ids) => publicList(env, ids)),
    getIds(env, `req-out:${id}`).then((ids) => publicList(env, ids)),
  ])
  return { username: await getUsername(env, id), friends, incoming, outgoing: outgoing.map((u) => u.username) }
}
