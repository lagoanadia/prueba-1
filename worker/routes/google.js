// POST /api/auth/google   body: { credential: "<ID token de Google>" }
// Verifica el token de Google y crea nuestra cookie de sesión.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { verifyGoogleIdToken } from '../../server/google.js'
import { createSessionCookie } from '../../server/session.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed

  // Si faltan variables, es un fallo de CONFIGURACIÓN del servidor (500), no del usuario (401).
  // Así el error nos dice exactamente qué falta en vez de un engañoso "Invalid credential".
  const missing = ['GOOGLE_CLIENT_ID', 'SESSION_SECRET'].filter((name) => !env[name])
  if (missing.length) {
    console.error('Missing runtime variables:', missing)
    return json({ error: `Server misconfigured: missing ${missing.join(', ')}` }, 500)
  }

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
