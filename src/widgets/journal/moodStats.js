// Análisis del año del Mood tracker: ranking de meses y semanas plenas (los 7 días en «bueno»).
import { addDays, todayISO, weekStart } from '../../lib/dates.js'

const GOOD = 'bueno'
export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Meses del año ordenados por lo verdes que han sido (proporción de días buenos sobre los días anotados). */
export function monthRanking(moods, year = Number(todayISO().slice(0, 4))) {
  const good = Array(12).fill(0)
  const logged = Array(12).fill(0)
  for (const [date, mood] of Object.entries(moods)) {
    if (!mood || Number(date.slice(0, 4)) !== year) continue
    const m = Number(date.slice(5, 7)) - 1
    logged[m]++
    if (mood === GOOD) good[m]++
  }
  return MONTHS.map((name, m) => ({ name, good: good[m], logged: logged[m] }))
    .filter((x) => x.logged > 0)
    .sort((a, b) => b.good / b.logged - a.good / a.logged || b.good - a.good)
}

/** Semanas (lunes a domingo) del año con los 7 días en «bueno», de la más reciente a la más antigua. */
export function fullGreenWeeks(moods, year = Number(todayISO().slice(0, 4)), today = todayISO()) {
  const out = []
  for (let monday = weekStart(`${year}-01-01`); monday <= today; monday = addDays(monday, 7)) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    if (days.every((d) => d <= today && d.startsWith(String(year)) && moods[d] === GOOD)) out.push({ start: days[0], end: days[6] })
  }
  return out.reverse()
}
