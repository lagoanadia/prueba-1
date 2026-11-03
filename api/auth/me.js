// GET /api/auth/me  ->  { user } si hay sesión, 401 si no.
// El frontend lo llama al arrancar para saber si mostrar el login o la app.
import { rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'

export default async function handler(req, res) {
  if (rejectMethod(req, res, ['GET'])) return

  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'Not signed in' })
  return res.status(200).json({ user })
}
