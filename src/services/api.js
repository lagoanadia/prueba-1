// Envoltorio de fetch para hablar con NUESTRO backend (/api/...).
// Centraliza: JSON, cookies y manejo de errores, para no repetirlo en cada llamada.

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin', // manda la cookie de sesión
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'Something went wrong')
  return data
}
