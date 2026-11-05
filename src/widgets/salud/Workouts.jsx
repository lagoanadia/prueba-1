import { useState } from 'react'
import History from '../../components/History.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'

/**
 * Entrenamientos. Lo de HOY se ve en el widget; lo anterior va al historial (reloj).
 * S: minutos de hoy · T: sesiones de hoy · M: apuntar rápido · L: apuntar + sesiones de hoy.
 */
export default function Workouts({ size, data, update }) {
  const today = todayISO()
  const sports = sportsOf(data).length ? sportsOf(data) : ['Entreno'] // si aún no hay deportes, uno genérico
  const all = data.workouts ?? []
  const todays = all.filter((w) => w.date === today)
  const past = all.filter((w) => w.date < today).sort((a, b) => b.date.localeCompare(a.date))
  const minutes = todays.reduce((s, w) => s + w.min, 0)
  const [sport, setSport] = useState(sports[0])
  const [min, setMin] = useState('')
  const [notes, setNotes] = useState('')

  const save = (e) => {
    e.preventDefault()
    if (!(Number(min) > 0)) return
    update((d) => ({ ...d, workouts: [...(d.workouts ?? []), { id: crypto.randomUUID(), date: today, sport, min: Number(min), notes: notes.trim() }] }))
    setMin('')
    setNotes('')
  }

  const history = <History title="Entrenamientos" empty="Aún no hay días anteriores" items={past.map((w) => ({ id: w.id, date: `${formatShort(w.date)} · ${w.min} min`, text: `${w.sport}${w.notes ? ` — ${w.notes}` : ''}` }))} />

  if (size === 'S') {
    return <div className="w-center">{history}<b className="big">{minutes}<small> min</small></b><span className="w-hint">hoy</span></div>
  }

  const list = (
    <ul className="workouts">
      {todays.map((w) => (
        <li key={w.id}>
          <span className="dot" style={{ background: colorOf(sports, w.sport) }} />
          <span className="w-ellipsis"><b>{w.sport}</b>{w.notes && <span className="w-hint"> · {w.notes}</span>}</span>
          <b className="workout-min">{w.min} min</b>
        </li>
      ))}
      {todays.length === 0 && <li className="w-hint">Nada hoy todavía</li>}
    </ul>
  )
  const form = (
    <form className={`w-form ${size === 'L' ? 'w-form-col' : ''}`} onSubmit={save}>
      <div className="w-form">
        <select value={sport} onChange={(e) => setSport(e.target.value)}>{sports.map((s) => <option key={s}>{s}</option>)}</select>
        <input type="number" min="1" placeholder="min" value={min} onChange={(e) => setMin(e.target.value)} style={{ width: 70, flex: 'none' }} />
        {size !== 'L' && <button className="pill pill-on" disabled={!(Number(min) > 0)}>Guardar</button>}
      </div>
      {size === 'L' && (
        <div className="w-form">
          <input placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={80} />
          <button className="pill pill-on" disabled={!(Number(min) > 0)}>Guardar</button>
        </div>
      )}
    </form>
  )

  if (size === 'T') return <>{history}<b className="big">{minutes}<small> min hoy</small></b>{list}</>
  if (size === 'M') return <>{history}{form}{list}</>
  return <>{history}{form}{list}</>
}
