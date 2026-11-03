// POST /api/auth/google   body: { credential: "<ID token de Google>" }
// Verifica el token de Google y crea nuestra cookie de sesión.
import { rejectMethod } from '../../server/http.js'
import { verifyGoogleIdToken } from '../../server/google.js'
import { createSessionCookie } from '../../server/session.js'

export default async function handler(req, res) {
  if (rejectMethod(req, res, ['POST'])) return

  const credential = req.body?.credential
  if (typeof credential !== 'string' || credential.length === 0) {
    return res.status(400).json({ error: 'Missing Google credential' })
  }

  let user
  try {
    user = await verifyGoogleIdToken(credential)
  } catch (err) {
    console.warn('Google token rejected:', err.message)
    return res.status(401).json({ error: 'Invalid Google credential' })
  }

  res.setHeader('Set-Cookie', await createSessionCookie(user))
  return res.status(200).json({ user })
}
