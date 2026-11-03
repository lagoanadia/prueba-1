// GET /api/auth/me  ->  { user } si hay sesión, 401 si no.
// El frontend lo llama al arrancar para saber si mostrar el login o la app.
import { json, rejectMethod } from '../../../server/http.js'
import { getSessionUser } from '../../../server/session.js'

export async function onRequest({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'Not signed in' }, 401)
  return json({ user })
}
