// Utilidades HTTP compartidas por las funciones de /api.
// La carpeta server/ NO es pública: Vercel solo convierte en endpoints lo que hay en /api.

/** Lee la cabecera "Cookie: a=1; b=2" y la convierte en { a: '1', b: '2' } */
export function parseCookies(req) {
  const header = req.headers.cookie ?? ''
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name)
      .map(([name, ...rest]) => [name, decodeURIComponent(rest.join('='))])
  )
}

/** Responde 405 si el método HTTP no es el esperado. Devuelve true si ya respondió. */
export function rejectMethod(req, res, allowed) {
  if (allowed.includes(req.method)) return false
  res.setHeader('Allow', allowed.join(', '))
  res.status(405).json({ error: `Method ${req.method} not allowed` })
  return true
}
