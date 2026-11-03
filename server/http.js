// Utilidades HTTP compartidas por las funciones de /functions.
// Cloudflare usa la API estándar de la web: Request -> Response (igual que fetch en el navegador).
// La carpeta server/ NO es pública: Cloudflare solo convierte en endpoints lo que hay en /functions.

/** Crea una Response JSON. */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/** Lee el body JSON; devuelve null si no es JSON válido. */
export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** Lee la cabecera "Cookie: a=1; b=2" y la convierte en { a: '1', b: '2' } */
export function parseCookies(request) {
  const header = request.headers.get('Cookie') ?? ''
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name)
      .map(([name, ...rest]) => [name, decodeURIComponent(rest.join('='))])
  )
}

/** Devuelve una Response 405 si el método no está permitido, o null si está bien. */
export function rejectMethod(request, allowed) {
  if (allowed.includes(request.method)) return null
  return json({ error: `Method ${request.method} not allowed` }, 405, { Allow: allowed.join(', ') })
}
