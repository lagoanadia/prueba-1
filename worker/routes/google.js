// POST /api/auth/google   body: { credential: "<ID token de Google>" }
// Verifica el token de Google y crea nuestra cookie de sesión.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { verifyGoogleIdToken } from '../../server/google.js'
import { createSessionCookie } from '../../server/session.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed

  const credential = (await readJson(request))?.credential
  if (typeof credential !== 'string' || credential.length === 0) {
    return json({ error: 'Missing Google credential' }, 400)
  }

  let user
  try {
    user = await verifyGoogleIdToken(credential, env)
  } catch (err) {
    console.warn('Google token rejected:', err.message)
    return json({ error: 'Invalid Google credential' }, 401)
  }

  return json({ user }, 200, { 'Set-Cookie': await createSessionCookie(user, env, request) })
}
