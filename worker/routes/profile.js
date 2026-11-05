// /api/profile   GET -> { avatar }   ·   PUT { avatar } -> { avatar }
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { getProfile, saveProfile } from '../../server/profile.js'
import { AVATAR_OPTIONS, isValidAvatar } from '../../src/data/avatar.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'PUT'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  if (request.method === 'GET') return json(await getProfile(env, user.id))

  const body = await readJson(request)
  // El servidor también comprueba que no te pongas un traje bloqueado (no basta con ocultarlo en la UI).
  if (!isValidAvatar(body?.avatar)) return json({ error: 'Avatar no válido' }, 400)
  // Guardamos solo las claves conocidas (por si mandan campos de más)
  const avatar = Object.fromEntries(Object.keys(AVATAR_OPTIONS).map((k) => [k, body.avatar[k]]))
  await saveProfile(env, user.id, { avatar })
  return json({ avatar })
}
