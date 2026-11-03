// POST /api/auth/logout  ->  borra la cookie de sesión.
import { rejectMethod } from '../../server/http.js'
import { clearSessionCookie } from '../../server/session.js'

export default function handler(req, res) {
  if (rejectMethod(req, res, ['POST'])) return

  res.setHeader('Set-Cookie', clearSessionCookie())
  return res.status(204).end()
}
