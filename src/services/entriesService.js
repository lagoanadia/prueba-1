// Tareas / entradas guardadas en el backend (Cloudflare KV).
import { request } from './api.js'

export const listEntries = async () => (await request('/api/entries')).entries
export const addEntries = async (actions) => (await request('/api/entries', { method: 'POST', body: { actions } })).entries
export const setDone = async (id, done) => (await request('/api/entries', { method: 'PATCH', body: { id, done } })).entries
