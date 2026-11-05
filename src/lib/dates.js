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
