import { dayShort, lastDays, todayISO } from '../../lib/dates.js'

/** Sueño: horas de la última noche (− / +) y las noches anteriores en barras. */
export default function Sleep({ size, data, update }) {
  const today = todayISO()
  const sleep = data.sleep ?? {}
  const goal = data.sleepGoal ?? 8
  const h = sleep[today] ?? 0 // la noche que acaba de terminar se guarda con la fecha de hoy
  const set = (v) => update((d) => ({ ...d, sleep: { ...d.sleep, [today]: Math.max(0, Math.min(14, v)) } }))
  const stepper = (
    <div className="sleep-step">
      <button className="mini" onClick={() => set(h - 0.5)} aria-label="Menos">−</button>
      <b className="big">{h}<small> h</small></b>
      <button className="mini" onClick={() => set(h + 0.5)} aria-label="Más">+</button>
    </div>
  )

  if (size === 'S') return <div className="w-center">{stepper}<span className="w-hint">anoche</span></div>

  const nights = lastDays(size === 'M' ? 7 : 14)
  return (
    <>
      {stepper}
      <div className="bars bars-sleep" style={{ '--goal': `${(goal / 12) * 100}%` }}>
        <span className="bars-goal" aria-hidden="true" />
        {nights.map((d, i) => (
          <div key={d} className={`bar-col ${d === today ? 'is-now' : ''}`} title={`${dayShort(d)}: ${sleep[d] ?? 0} h`}>
            <span className="bar-fill" style={{ height: `${Math.min(100, ((sleep[d] ?? 0) / 12) * 100)}%`, '--d': `${i * 30}ms` }} />
          </div>
        ))}
      </div>
    </>
  )
}
