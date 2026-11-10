// Semanas en las que has usado la app (para la meta fija «Usar InBloks»). Se anota en este dispositivo y la meta lo recoge.
import { todayISO, weekStart } from './dates.js'

const KEY = 'inbloks-weeks'
export const USAGE_EVENT = 'inbloks-used'

export function usedWeeks() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? [] } catch { return [] }
}

/** Anota que hoy has hecho un cambio: basta uno en la semana para que cuente. */
let quiet = false
/** Para cambios automáticos (no los hace la persona): no cuentan como uso. */
export function quietly(fn) { quiet = true; try { fn() } finally { quiet = false } }

export function recordUse() {
  if (quiet) return
  const week = weekStart(todayISO())
  const weeks = usedWeeks()
  if (weeks.includes(week)) return
  try { localStorage.setItem(KEY, JSON.stringify([...weeks, week].slice(-120))) } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event(USAGE_EVENT))
}
