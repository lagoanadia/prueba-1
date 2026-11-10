import { addDays, todayISO, weekDays, weekStart } from '../../lib/dates.js'
import { fmtHM } from './healthUtils.js'

/** Resumen de la semana: sesiones hechas, tiempo activo, días con el objetivo de pasos y racha de semanas. */
export default function WeekSummary({ data }) {
  const today = todayISO()
  const plan = data.plan ?? []
  const planned = plan.filter((p) => p && p !== 'Descanso').length
  const workouts = data.workouts ?? []
  const inWeek = (monday) => { const days = weekDays(monday); return workouts.filter((w) => days.includes(w.date)) }
  const mine = inWeek(today)
  const minutes = mine.reduce((s, w) => s + w.min, 0)
  const goal = data.stepsGoal ?? 8000
  const stepsMet = weekDays(today).filter((d) => (data.steps?.[d] ?? 0) >= goal).length
  const met = (monday) => { const n = inWeek(monday).length; return planned > 0 ? n >= planned : n >= 1 }

  // Racha: semanas seguidas cumpliendo lo planificado (la actual cuenta si ya lo has cumplido)
  let streak = 0
  let monday = weekStart(today)
  if (met(monday)) streak++
  for (monday = addDays(monday, -7); streak < 200 && met(monday); monday = addDays(monday, -7)) streak++

  return (
    <div className="sa-summary">
      <div className="sa-tile is-green"><span>Sesiones</span><b>{mine.length}</b><small>{planned ? `de ${planned} previstas` : 'esta semana'}</small></div>
      <div className="sa-tile is-blue"><span>Tiempo activo</span><b>{fmtHM(minutes)}</b><small>esta semana</small></div>
      <div className="sa-tile is-yellow"><span>Objetivo de pasos</span><b>{stepsMet} de 7</b><small>días cumplidos</small></div>
      <div className="sa-tile is-pink"><span>Racha</span><b>{streak}</b><small>{streak === 1 ? 'semana seguida' : 'semanas seguidas'}</small></div>
    </div>
  )
}
