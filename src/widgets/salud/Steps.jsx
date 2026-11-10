import { useState } from 'react'
import { dayShort, lastDays, todayISO } from '../../lib/dates.js'
import { fmtNum } from './healthUtils.js'

/** Pasos de la semana: apuntas los de hoy y ves los últimos 7 días contra tu objetivo. */
export default function Steps({ data, update }) {
  const today = todayISO()
  const steps = data.steps ?? {}
  const goal = data.stepsGoal ?? 8000
  const days = lastDays(7)
  const known = days.map((d) => steps[d] ?? 0)
  const logged = days.filter((d) => steps[d] != null)
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + steps[d], 0) / logged.length) : 0
  const max = Math.max(goal * 1.25, ...known, 1)
  const [val, setVal] = useState('')
  const save = (e) => { e.preventDefault(); const n = Number(val); if (n >= 0 && val !== '') { update((d) => ({ ...d, steps: { ...(d.steps ?? {}), [today]: Math.round(n) } })); setVal('') } }
  const setGoal = () => { const g = Number(window.prompt('Objetivo de pasos al día', String(goal))); if (g > 0) update((d) => ({ ...d, stepsGoal: Math.round(g) })) }

  return (
    <div className="sa-steps">
      <div className="sa-row sa-split">
        <div><span className="sa-label">Hoy</span><b className="sa-big">{fmtNum(steps[today] ?? 0)}<small> pasos</small></b></div>
        <div><span className="sa-label">Media diaria</span><b className="sa-big">{fmtNum(avg)}</b></div>
        <form className="sa-row" onSubmit={save}><input type="number" min="0" inputMode="numeric" placeholder="Pasos de hoy" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Pasos de hoy" /><button className="sa-btn" disabled={val === ''}>Guardar</button></form>
      </div>
      <div className="sa-chart" style={{ '--goal': `${(goal / max) * 100}%` }}>
        <button className="sa-goal" onClick={setGoal} title="Cambiar el objetivo">Objetivo {fmtNum(goal)}</button>
        {days.map((d, i) => (
          <div key={d} className={`sa-col ${d === today ? 'is-now' : ''}`} title={`${dayShort(d)}: ${fmtNum(known[i])}`}>
            <span className="sa-num">{known[i] ? fmtNum(known[i]) : ''}</span>
            <span className={`sa-bar ${known[i] >= goal ? 'is-met' : ''}`} style={{ height: `${(known[i] / max) * 100}%` }} />
            <small>{d === today ? 'Hoy' : dayShort(d)}</small>
          </div>
        ))}
      </div>
      <div className="sa-legend"><span><i className="is-met" />Objetivo cumplido</span><span><i />Por debajo</span></div>
    </div>
  )
}
