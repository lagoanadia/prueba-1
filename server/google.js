import { createRemoteJWKSet, jwtVerify } from 'jose'

/*
 * VERIFICAR EL TOKEN DE GOOGLE
 *
 * Cuando el usuario inicia sesión, Google le da al frontend un "ID token" (un JWT).
 * El frontend nos lo manda, pero NO podemos fiarnos a ciegas: cualquiera podría
 * inventarse uno. Por eso comprobamos:
 *   1. La firma -> con las claves públicas de Google (JWKS). Solo Google tiene la privada.
 *   2. issuer   -> que lo haya emitido Google.
 *   3. audience -> que sea para NUESTRA app (nuestro Client ID) y no para otra.
 *   4. exp      -> que no esté caducado (jose lo comprueba solo).
 */

// jose descarga y cachea las claves públicas de Google.
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set')

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  })

  if (!payload.email_verified) throw new Error('Google email is not verified')

  return { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture }
}
