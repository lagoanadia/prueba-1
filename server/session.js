import { SignJWT, jwtVerify } from 'jose'
import { parseCookies } from './http.js'

/*
 * SESIÓN PROPIA
 *
 * Google nos dice UNA vez quién es el usuario (en el login). A partir de ahí
 * creamos NUESTRO propio token (un JWT firmado con SESSION_SECRET) y lo guardamos
 * en una cookie httpOnly. En cada petición el navegador la manda solo, y el
 * backend comprueba la firma: si alguien la modifica, la firma deja de cuadrar.
 *
 * httpOnly  -> JavaScript del navegador NO puede leerla (protege frente a XSS)
 * Secure    -> solo viaja por HTTPS
 * SameSite  -> otras webs no pueden hacer POST a nuestra API con esta cookie (CSRF)
 *
 * En Cloudflare las variables de entorno NO están en process.env: llegan en `env`
 * (context.env), por eso todas las funciones lo reciben como parámetro.
 */

const COOKIE_NAME = 'session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 días

function getSecret(env) {
  const secret = env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and be at least 32 characters long')
  }
  return new TextEncoder().encode(secret)
}

function serializeCookie(value, maxAge, request) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  // En local (http://localhost) algunos navegadores rechazan cookies Secure.
  if (new URL(request.url).protocol === 'https:') parts.push('Secure')
  return parts.join('; ')
}

/** Crea la cabecera Set-Cookie con la sesión del usuario. */
export async function createSessionCookie(user, env, request) {
  const token = await new SignJWT({ name: user.name, email: user.email, picture: user.picture })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret(env))
  return serializeCookie(token, MAX_AGE_SECONDS, request)
}

/** Cabecera Set-Cookie que borra la sesión (Max-Age=0). */
export function clearSessionCookie(request) {
  return serializeCookie('', 0, request)
}

/** Devuelve el usuario de la sesión, o null si no hay sesión válida. */
export async function getSessionUser(request, env) {
  const token = parseCookies(request)[COOKIE_NAME]
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(env), { algorithms: ['HS256'] })
    return { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture }
  } catch {
    return null // firma inválida, caducado, etc.
  }
}
