// Fechas siempre en la zona horaria del usuario, en formato "2026-11-05".
export const todayISO = () => new Date().toLocaleDateString('en-CA')

/** "Hoy, jueves 5 de noviembre" */
export function formatToday() {
  const d = new Date()
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' })
  const dayMonth = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  return `Hoy, ${weekday} ${dayMonth}`
}

/** "2026-11-06" -> "vie 6 nov" */
export function formatShort(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
}

/** Suma (o resta) días a una fecha "YYYY-MM-DD". */
export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

/** Los últimos n días, del más antiguo a hoy. */
export const lastDays = (n, today = todayISO()) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1))

/** Días que faltan desde hoy hasta una fecha (negativo si ya pasó). */
export const daysUntil = (iso, today = todayISO()) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000)

/** Semanas del mes actual (empiezan en lunes). Huecos = null. */
export function monthWeeks(today = todayISO()) {
  const [y, m] = today.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const offset = (first.getDay() + 6) % 7 // lunes = 0
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}

/** Racha: días seguidos marcados hasta hoy (si hoy aún no, cuenta desde ayer). */
export function streak(dates, today = todayISO()) {
  const set = new Set(dates)
  let day = set.has(today) ? today : addDays(today, -1)
  let n = 0
  while (set.has(day)) { n++; day = addDays(day, -1) }
  return n
}

/** "2026-12-31" -> "31 de diciembre de 2026" */
export const formatLong = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

/** Todo el año actual en columnas de semanas (lunes arriba), estilo GitHub. Huecos = null. */
export function yearWeeks(today = todayISO()) {
  const year = Number(today.slice(0, 4))
  const first = new Date(year, 0, 1)
  const days = (new Date(year + 1, 0, 1) - first) / 86400000
  const offset = (first.getDay() + 6) % 7
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, 0, 1 + i).toLocaleDateString('en-CA'))]
  while (cells.length % 7) cells.push(null)
  return cells
}
