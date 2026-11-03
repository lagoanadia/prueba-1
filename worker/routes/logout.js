// POST /api/auth/logout  ->  borra la cookie de sesión.
import { rejectMethod } from '../../server/http.js'
import { clearSessionCookie } from '../../server/session.js'

export default async function handler({ request }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed

  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookie(request) } })
}
