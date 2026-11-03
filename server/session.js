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
 */

const COOKIE_NAME = 'session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 días

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and be at least 32 characters long')
  }
  return new TextEncoder().encode(secret)
}

function serializeCookie(value, maxAge) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  // En local (vercel dev, http://localhost) algunos navegadores rechazan cookies Secure.
  if (process.env.VERCEL_ENV !== 'development') parts.push('Secure')
  return parts.join('; ')
}

/** Crea la cabecera Set-Cookie con la sesión del usuario. */
export async function createSessionCookie(user) {
  const token = await new SignJWT({ name: user.name, email: user.email, picture: user.picture })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret())
  return serializeCookie(token, MAX_AGE_SECONDS)
}

/** Cabecera Set-Cookie que borra la sesión (Max-Age=0). */
export function clearSessionCookie() {
  return serializeCookie('', 0)
}

/** Devuelve el usuario de la sesión, o null si no hay sesión válida. */
export async function getSessionUser(req) {
  const token = parseCookies(req)[COOKIE_NAME]
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    return { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture }
  } catch {
    return null // firma inválida, caducado, etc.
  }
}
