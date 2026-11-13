// Pequeñas ayudas de tiempo para los widgets de Salud
export const toMin = (hhmm) => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
export const fromMin = (m) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
export const fmtHM = (min) => { const h = Math.floor(min / 60); const m = min % 60; return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min` }
export const fmtNum = (n) => Number(n).toLocaleString('es-ES')

/**
 * Entrenos hechos, sacados del plan de «Ejercicio de la semana»: una sesión se da por hecha sola cuando pasa su hora
 * (a menos que la hayas desmarcado a mano) y las que ya marcaste de otras semanas también cuentan. Sin tener que apuntar nada.
 * `legacy` añade los entrenos que se apuntaron a mano antes. Devuelve [{ date, sport, min }].
 */
export function doneEntries(data, today, weekOf, legacy = false) {
  const out = []
  const wk = weekOf(today)
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  ;(data.planSessions ?? []).forEach((s) => {
    const dates = new Set(Object.entries(s.done ?? {}).filter(([, ok]) => ok).map(([d]) => d))
    const date = wk[s.day]
    if (date && s.done?.[date] === undefined && (date < today || (date === today && mins >= toMin(s.start) + s.min))) dates.add(date)
    dates.forEach((d) => out.push({ date: d, sport: s.sport, min: s.min }))
  })
  if (legacy) (data.workouts ?? []).filter((w) => !w.planId).forEach((w) => out.push({ date: w.date, sport: w.sport, min: w.min }))
  return out
}
