import { ApiError, request } from './api.js'

/** Usuario actual, o null si no hay sesión. */
export async function getCurrentUser() {
  try {
    const { user } = await request('/api/auth/me')
    return user
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

/** Manda el ID token de Google al backend; él lo verifica y crea la sesión. */
export async function signInWithGoogle(credential) {
  const { user } = await request('/api/auth/google', { method: 'POST', body: { credential } })
  return user
}

export async function signOut() {
  await request('/api/auth/logout', { method: 'POST' })
  window.google?.accounts.id.disableAutoSelect() // que Google no vuelva a entrar solo
}
