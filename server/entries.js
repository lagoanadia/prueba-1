/*
 * ALMACÉN DE ENTRADAS (Cloudflare KV)
 *
 * KV es una base de datos clave -> valor muy simple. Guardamos UNA clave por usuario:
 *   "entries:<id de Google>"  ->  JSON con todas sus entradas
 * Para una hackathon es suficiente; si crece, el siguiente paso sería D1 (SQL).
 *
 * Entrada: { id, area, title, date: 'YYYY-MM-DD'|null, time: 'HH:MM'|null, done, createdAt }
 */
import { AREA_IDS } from '../src/data/areas.js'

const MAX_ENTRIES = 2000
const key = (userId) => `entries:${userId}`
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export async function listEntries(env, userId) {
  return (await env.DATA.get(key(userId), 'json')) ?? []
}

async function save(env, userId, entries) {
  await env.DATA.put(key(userId), JSON.stringify(entries.slice(-MAX_ENTRIES)))
}

/** Valida y normaliza una acción del asistente. Devuelve null si no vale. */
export function cleanAction(a) {
  if (!AREA_IDS.includes(a?.area)) return null
  const title = typeof a.title === 'string' ? a.title.trim().slice(0, 120) : ''
  if (!title) return null
  return {
    area: a.area,
    title,
    date: DATE_RE.test(a.date) ? a.date : null,
    time: TIME_RE.test(a.time) ? a.time : null,
    done: a.done === true,
    // Para colocarlo en su sitio (ver server/assistantContext.js)
    kind: ['task', 'assignment', 'meeting', 'note'].includes(a.kind) ? a.kind : 'note',
    project: typeof a.project === 'string' ? a.project.trim().slice(0, 60) || null : null,
    course: typeof a.course === 'string' ? a.course.trim().slice(0, 60) || null : null,
  }
}

export async function addEntries(env, userId, actions) {
  const entries = await listEntries(env, userId)
  const now = Date.now()
  const added = actions.map((a) => ({ id: crypto.randomUUID(), ...a, createdAt: now }))
  await save(env, userId, [...entries, ...added])
  return [...entries, ...added]
}

export async function updateEntry(env, userId, id, changes) {
  const entries = await listEntries(env, userId)
  const next = entries.map((e) => (e.id === id ? { ...e, ...changes } : e))
  await save(env, userId, next)
  return next
}

export async function deleteEntry(env, userId, id) {
  const next = (await listEntries(env, userId)).filter((e) => e.id !== id)
  await save(env, userId, next)
  return next
}
