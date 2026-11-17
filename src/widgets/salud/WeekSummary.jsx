import { addDays, todayISO, weekDays, weekStart } from '../../lib/dates.js'
import { doneEntries, fmtHM } from './healthUtils.js'

/** Resumen de la semana: deportes distintos (y el que más), tiempo activo, días con el objetivo de pasos y racha de semanas. */
export default function WeekSummary({ size, data }) {
  const today = todayISO()
  const plan = data.plan ?? []
  const sessions = data.planSessions ?? []
  const planned = sessions.length || plan.filter((p) => p && p !== 'Descanso').length
  const workouts = doneEntries(data, today, weekDays, true) // lo del plan se da por hecho solo
  const inWeek = (monday) => { const days = weekDays(monday); return workouts.filter((w) => days.includes(w.date)) }
  const mine = inWeek(today)
  const minutes = mine.reduce((s, w) => s + w.min, 0)
  const lastWeek = inWeek(addDays(today, -7)).reduce((s, w) => s + w.min, 0) // para compararlo con la semana pasada
  // Deportes distintos de la semana y el que más veces (si empatan, el de más tiempo)
  const per = new Map()
  mine.forEach((w) => { const e = per.get(w.sport) ?? { sport: w.sport, n: 0, min: 0 }; e.n++; e.min += w.min; per.set(w.sport, e) })
  const top = [...per.values()].sort((a, b) => b.n - a.n || b.min - a.min)[0]
  const goal = data.stepsGoal ?? 8000
  const stepsMet = weekDays(today).filter((d) => (data.steps?.[d] ?? 0) >= goal).length
  const met = (monday) => { const n = inWeek(monday).length; return planned > 0 ? n >= planned : n >= 1 }

  // Racha: semanas seguidas cumpliendo lo planificado (la actual cuenta si ya lo has cumplido)
  let streak = 0
  let monday = weekStart(today)
  if (met(monday)) streak++
  for (monday = addDays(monday, -7); streak < 200 && met(monday); monday = addDays(monday, -7)) streak++

  const diff = minutes - lastWeek
  const vs = lastWeek || diff ? `${diff >= 0 ? '+' : '−'}${fmtHM(Math.abs(diff))} que la semana pasada` : 'esta semana'

  // M: cuatro cifras en una fila, sin letra pequeña
  if (size === 'M') {
    return (
      <div className="sa-summary sa-summary-M">
        <div className="sa-tile is-green"><span>Deportes</span><b>{per.size}</b></div>
        <div className="sa-tile is-blue"><span>Tiempo activo</span><b>{fmtHM(minutes)}</b></div>
        <div className="sa-tile is-yellow"><span>Pasos</span><b>{stepsMet} de 7</b></div>
        <div className="sa-tile is-pink"><span>Racha</span><b>{streak} sem</b></div>
      </div>
    )
  }
  return (
    <div className="sa-summary">
      <div className="sa-tile is-green"><span>Deportes</span><b>{per.size}</b><small>{top ? `${top.sport} · ${top.n} ${top.n === 1 ? 'vez' : 'veces'}` : 'esta semana'}</small></div>
      <div className="sa-tile is-blue"><span>Tiempo activo</span><b>{fmtHM(minutes)}</b><small>{vs}</small></div>
      <div className="sa-tile is-yellow"><span>Objetivo de pasos</span><b>{stepsMet} de 7</b><small>días cumplidos</small></div>
      <div className="sa-tile is-pink"><span>Racha</span><b>{streak}</b><small>{streak === 1 ? 'semana seguida' : 'semanas seguidas'}</small></div>
    </div>
  )
}
