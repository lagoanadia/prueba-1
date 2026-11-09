// /api/profile   GET -> { avatar }   ·   PUT { avatar?, settings? } -> { avatar, settings }
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { getProfile, saveProfile } from '../../server/profile.js'
import { normalizeSettings } from '../../src/data/settings.js'
import { AVATAR_OPTIONS, DEFAULT_AVATAR, isValidAvatar } from '../../src/data/avatar.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'PUT'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  if (request.method === 'GET') return json(await getProfile(env, user.id))

  const body = await readJson(request)
  const current = await getProfile(env, user.id)
  let { avatar } = current
  let settings = current.settings
  if (body?.avatar !== undefined) {
    if (!body.avatar || typeof body.avatar !== 'object') return json({ error: 'Avatar no válido' }, 400)
    // Lo que falte (p. ej. opciones nuevas) se rellena con el valor por defecto,
    // y guardamos solo las claves conocidas (por si mandan campos de más).
    avatar = Object.fromEntries(Object.keys(AVATAR_OPTIONS).map((k) => [k, body.avatar[k] ?? DEFAULT_AVATAR[k]]))
    // El servidor también valida: no basta con que la UI solo ofrezca opciones correctas.
    if (!isValidAvatar(avatar)) return json({ error: 'Avatar no válido' }, 400)
  }
  if (body?.settings !== undefined) {
    if (!body.settings || typeof body.settings !== 'object') return json({ error: 'Ajustes no válidos' }, 400)
    settings = normalizeSettings(body.settings)
  }
  await saveProfile(env, user.id, { avatar, settings })
  return json({ avatar, settings })
}
