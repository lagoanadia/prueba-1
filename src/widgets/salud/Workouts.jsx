import Select from '../../components/Select.jsx'
import { useState } from 'react'
import History from '../../components/History.jsx'
import { formatShort, todayISO, weekDays } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'
import { fmtHM } from './healthUtils.js'

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
  const [range, setRange] = useState('week') // la rueda: 'week' | 'month'
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

  // Rueda: el tiempo de cada deporte en la semana o en el mes, y cuál has practicado más
  const week = weekDays(today)
  const inRange = (date) => (range === 'week' ? week.includes(date) : date.slice(0, 7) === today.slice(0, 7))
  const by = new Map()
  all.filter((w) => inRange(w.date)).forEach((w) => { const e = by.get(w.sport) ?? { sport: w.sport, min: 0, n: 0 }; e.min += w.min; e.n++; by.set(w.sport, e) })
  const ranking = [...by.values()].sort((a, b) => b.min - a.min)
  const total = ranking.reduce((n, r) => n + r.min, 0)
  let acc = 0
  const stops = ranking.map((r) => { const a = (acc / total) * 360; acc += r.min; return `${colorOf(sports, r.sport)} ${a}deg ${(acc / total) * 360}deg` }).join(', ')
  const wheel = (
    <div className="wk-wheel">
      <div className="wk-range" role="group" aria-label="Periodo">
        <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')} aria-pressed={range === 'week'}>Semana</button>
        <button className={range === 'month' ? 'on' : ''} onClick={() => setRange('month')} aria-pressed={range === 'month'}>Mes</button>
      </div>
      <div className="wk-wheel-body">
        <div className="wk-donut" style={{ background: ranking.length ? `conic-gradient(${stops})` : 'var(--soft)' }}>
          <div className="wk-hole">
            {ranking.length
              ? <><span>Más practicado</span><b style={{ color: colorOf(sports, ranking[0].sport) }}>{ranking[0].sport}</b><span>{fmtHM(ranking[0].min)}</span></>
              : <span>Aún no hay entrenos {range === 'week' ? 'esta semana' : 'este mes'}</span>}
          </div>
        </div>
        {ranking.length > 0 && (
          <ul className="wk-legend">
            {ranking.map((r, i) => <li key={r.sport} className={i === 0 ? 'is-top' : ''}><i style={{ background: colorOf(sports, r.sport) }} /><span className="w-ellipsis">{r.sport}</span><em>{fmtHM(r.min)}</em><b>{Math.round((r.min / total) * 100)}%</b></li>)}
            <li className="wk-total"><span>Total</span><b>{fmtHM(total)}</b></li>
          </ul>
        )}
      </div>
    </div>
  )

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
        <Select value={sport} label="Deporte" onChange={setSport} options={sports.map((s) => ({ value: s, label: s, color: colorOf(sports, s) }))} />
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

  if (size === 'T') return <>{history}<b className="big">{minutes}<small> min hoy</small></b>{form}{list}</>
  return <>{history}{wheel}{form}{list}</>
}
