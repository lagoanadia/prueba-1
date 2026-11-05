import { useState } from 'react'
import { dayShort, todayISO, weekDays } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'

// La planificación es semanal y se repite: guardamos qué toca cada día de la semana (0 = lunes)
const DEFAULT_PLAN = ['Gimnasio', 'Natación', 'Descanso', 'Gimnasio', 'Pilates', 'Senderismo', 'Descanso']

/**
 * Plan semanal. S: lo de hoy · T: la semana en lista · M: la semana en columnas
 * L: la semana editable (elige deporte por día) + tu biblioteca de deportes.
 */
export default function Plan({ size, data, update }) {
  const today = todayISO()
  const days = weekDays(today)
  const plan = data.plan ?? DEFAULT_PLAN
  const sports = sportsOf(data)
  const todayIdx = days.indexOf(today)
  const [name, setName] = useState('')
  const [showLib, setShowLib] = useState(false) // en L: alterna entre la semana y tu biblioteca de deportes

  const setDay = (i, value) => update((d) => { const p = [...(d.plan ?? DEFAULT_PLAN)]; p[i] = value; return { ...d, plan: p } })
  const addSport = (e) => {
    e.preventDefault()
    if (!name.trim() || sports.includes(name.trim())) return
    update((d) => ({ ...d, sports: [...sportsOf(d), name.trim()] }))
    setName('')
  }
  const removeSport = (s) => update((d) => ({ ...d, sports: sportsOf(d).filter((x) => x !== s), plan: (d.plan ?? DEFAULT_PLAN).map((p) => (p === s ? 'Descanso' : p)) }))

  if (size === 'S') {
    const s = plan[todayIdx]
    return (
      <div className="w-center">
        <span className="w-hint">Hoy</span>
        <span className="sport-big" style={{ '--c': colorOf(sports, s) }}>{s}</span>
      </div>
    )
  }

  if (size === 'M') {
    return (
      <div className="week-cols">
        {days.map((d, i) => (
          <div key={d} className={`week-col ${i === todayIdx ? 'is-today' : ''}`}>
            <span className="w-hint">{dayShort(d)}</span>
            <span className="week-chip" style={{ '--c': colorOf(sports, plan[i]) }} title={plan[i]}>{plan[i] === 'Descanso' ? '—' : plan[i].slice(0, 3)}</span>
          </div>
        ))}
      </div>
    )
  }

  // L: biblioteca de deportes (en lugar de la semana)
  if (size === 'L' && showLib) {
    return (
      <>
        <form className="sport-lib" onSubmit={addSport}>
          {sports.map((s) => (
            <span key={s} className="chip chip-lib" style={{ '--c': colorOf(sports, s) }}>
              {s}<button type="button" onClick={() => removeSport(s)} aria-label={`Quitar ${s}`}>×</button>
            </span>
          ))}
          <input placeholder="+ Deporte" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </form>
        <button className="pill pill-sm lib-toggle" onClick={() => setShowLib(false)}>← Semana</button>
      </>
    )
  }

  return (
    <>
      <ul className="week-list">
        {days.map((d, i) => (
          <li key={d} className={i === todayIdx ? 'is-today' : ''}>
            <span className="week-day">{dayShort(d)} {Number(d.slice(8))}</span>
            {size === 'L' ? (
              <select value={plan[i]} onChange={(e) => setDay(i, e.target.value)} style={{ '--c': colorOf(sports, plan[i]) }}>
                {[...sports, 'Descanso'].map((s) => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <span className="week-chip" style={{ '--c': colorOf(sports, plan[i]) }}>{plan[i]}</span>
            )}
          </li>
        ))}
      </ul>
      {size === 'L' && <button className="pill pill-sm lib-toggle" onClick={() => setShowLib(true)}>Mis deportes</button>}
    </>
  )
}
