import { addDays, todayISO, weekStart } from '../../lib/dates.js'

/**
 * Evolución semanal: minutos de ejercicio por semana (de los entrenamientos apuntados).
 * La línea discontinua es tu objetivo semanal (por defecto 150 min, lo que recomienda la OMS).
 * S: esta semana · M: 4 semanas · T y L: 8 semanas + ajustar objetivo.
 */
export default function Progress({ size, data, update }) {
  const today = todayISO()
  const goal = data.weeklyGoal ?? 150
  const workouts = data.workouts ?? []
  const n = size === 'M' ? 4 : 8
  const weeks = Array.from({ length: n }, (_, i) => addDays(weekStart(today), -7 * (n - 1 - i)))
  const totals = weeks.map((w) => workouts.filter((x) => x.date >= w && x.date < addDays(w, 7)).reduce((s, x) => s + x.min, 0))
  const thisWeek = totals[totals.length - 1]
  const max = Math.max(goal, ...totals, 1)
  const setGoal = (delta) => update((d) => ({ ...d, weeklyGoal: Math.max(30, (d.weeklyGoal ?? 150) + delta) }))

  if (size === 'S') {
    const pct = Math.min(100, Math.round((thisWeek / goal) * 100))
    return <div className="w-center"><div className="ring ring-green" style={{ '--p': pct }}><b>{pct}%</b></div><span className="w-hint">{thisWeek}/{goal} min</span></div>
  }

  return (
    <>
      <div className="w-row"><b className="big">{thisWeek}<small> / {goal} min</small></b>
        {<span className="goal-step"><button className="mini" onClick={() => setGoal(-30)} aria-label="Bajar objetivo">−</button><button className="mini" onClick={() => setGoal(30)} aria-label="Subir objetivo">+</button></span>}
      </div>
      <div className="bars" style={{ '--goal': `${(goal / max) * 100}%` }}>
        <span className="bars-goal" aria-hidden="true" />
        {totals.map((t, i) => (
          <div key={weeks[i]} className={`bar-col ${i === n - 1 ? 'is-now' : ''}`} title={`${t} min`}>
            <span className="bar-fill" style={{ height: `${(t / max) * 100}%`, '--d': `${i * 50}ms` }} />
          </div>
        ))}
      </div>
    </>
  )
}
