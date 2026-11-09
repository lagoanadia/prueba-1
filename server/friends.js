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

export const getFriendIds = async (env, userId) => (await env.DATA.get(`friends:${userId}`, 'json')) ?? []
export const saveFriendIds = (env, userId, ids) => env.DATA.put(`friends:${userId}`, JSON.stringify(ids))

/** Lista de amigos con su nombre y su avatar (lo único que se comparte). */
export async function listFriends(env, userId) {
  const ids = await getFriendIds(env, userId)
  const friends = await Promise.all(ids.map(async (id) => ({ username: await getUsername(env, id), avatar: (await getProfile(env, id)).avatar })))
  return friends.filter((f) => f.username) // si alguien dejó de tener nombre, no se muestra
}
