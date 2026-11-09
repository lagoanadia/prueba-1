// Tareas / entradas guardadas en el backend (Cloudflare KV).
import { request } from './api.js'

export const listEntries = async () => (await request('/api/entries')).entries
// El servidor coloca cada cosa en su área (entregas, tareas de proyecto, agenda): avisamos para que se recarguen
export const BOARDS_EVENT = 'boards-changed'
export const addEntries = async (actions) => {
  const r = await request('/api/entries', { method: 'POST', body: { actions, today: new Date().toLocaleDateString('en-CA') } })
  if (r.placed?.length) window.dispatchEvent(new CustomEvent(BOARDS_EVENT, { detail: r.placed.map((p) => p.area) }))
  return r.entries
}
export const setDone = async (id, done) => (await request('/api/entries', { method: 'PATCH', body: { id, done } })).entries
