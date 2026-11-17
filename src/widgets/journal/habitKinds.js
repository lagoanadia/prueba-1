import { addDays, streak, weekStart } from '../../lib/dates.js'

/**
 * Tipos de hábito: decide si sale en «Tareas de hoy».
 *  - Cada día ('daily'): todos los días hasta que lo marcas.
 *  - X veces por semana ('weekly' + times): solo mientras no llegas a las X de esa semana.
 *  - Solo apuntar ('log'): nunca es tarea; solo se apunta cuándo pasó (p. ej. la compra).
 */
export const KIND_OPTIONS = [
  { value: 'daily', label: 'Cada día' },
  { value: 'w2', label: '2 por semana' }, { value: 'w3', label: '3 por semana' }, { value: 'w4', label: '4 por semana' }, { value: 'w5', label: '5 por semana' },
  { value: 'log', label: 'Solo apuntar' },
]
export const kindValue = (h) => (h.kind === 'weekly' ? `w${h.times ?? 3}` : h.kind ?? 'daily')
export const fromKindValue = (v) => (v.startsWith('w') ? { kind: 'weekly', times: Number(v.slice(1)) } : { kind: v, times: undefined })

/** Veces marcadas esta semana (de lunes a hoy). */
export const weekCount = (days, today) => { const from = weekStart(today); return days.filter((d) => d >= from && d <= today).length }
/** Días desde la última vez (0 = hoy); null si nunca. */
export function daysAgo(days, today) {
  const past = days.filter((d) => d <= today).sort()
  if (!past.length) return null
  const last = past[past.length - 1]
  return Math.round((new Date(`${today}T12:00:00`) - new Date(`${last}T12:00:00`)) / 864e5)
}
/** Texto corto junto a cada hábito: racha, «2/3» o «hace 5 d». */
export function habitStatus(h, days, today) {
  if (h.kind === 'log') { const n = daysAgo(days, today); return n == null ? '' : n === 0 ? 'hoy' : `hace ${n} d` }
  if (h.kind === 'weekly') return `${weekCount(days, today)}/${h.times ?? 3}`
  const s = streak(days, today)
  return s > 1 ? `🔥 ${s}` : ''
}
/** ¿Sale hoy en «Tareas de hoy»? (Si ya lo marcaste hoy sigue saliendo, tachado.) */
export function isTaskToday(h, days, today) {
  if (h.kind === 'log') return false
  if (h.kind === 'weekly') return days.includes(today) || weekCount(days, today) < (h.times ?? 3)
  return true
}
export { addDays }
