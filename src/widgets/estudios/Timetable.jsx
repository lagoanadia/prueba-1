import { useEffect, useState } from 'react'
import { todayISO } from '../../lib/dates.js'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DEFAULT = {
  slots: ['8:30-9:20', '9:20-10:10', '10:10-11:00', '11:00-11:50', '12:10-13:00', '13:00-13:50'],
  cells: {},
}
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

/** Hora actual en minutos; se actualiza cada minuto para marcar la clase en curso. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id) }, [])
  return now
}

/**
 * Horario semanal (lunes a viernes). Se resalta hoy y la clase que está en curso.
 * S: la clase de ahora (o la siguiente) · T y M: las clases de hoy · L: toda la semana (toca una celda para editarla).
 */
export default function Timetable({ size, data, update }) {
  const tt = data.timetable ?? DEFAULT
  const now = useNow()
  const dayIdx = (new Date(`${todayISO()}T12:00:00`).getDay() + 6) % 7 // 0 = lunes; 5 y 6 = fin de semana
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const slotState = (slot) => { const [a, b] = slot.split('-').map(toMin); return nowMin >= b ? 'past' : nowMin >= a ? 'now' : 'next' }
  const [editing, setEditing] = useState(null)

  const setCell = (key, value) => update((d) => { const cur = d.timetable ?? DEFAULT; return { ...d, timetable: { ...cur, cells: { ...cur.cells, [key]: value } } } })
  const todays = dayIdx < 5 ? tt.slots.map((slot, i) => ({ slot, name: tt.cells[`${dayIdx}-${i}`], state: slotState(slot) })).filter((c) => c.name) : []

  if (size === 'S') {
    const cur = todays.find((c) => c.state === 'now') ?? todays.find((c) => c.state === 'next')
    return cur
      ? <div className="w-center"><span className="w-hint">{cur.state === 'now' ? 'Ahora' : 'Siguiente'}</span><b className="tt-big">{cur.name}</b><span className="w-hint">{cur.slot}</span></div>
      : <p className="w-hint w-center">{dayIdx < 5 ? 'Clases terminadas' : 'Fin de semana'}</p>
  }

  if (size === 'M' || size === 'T') {
    return (
      <ul className={`tt-today ${size === 'M' ? 'tt-row' : ''}`}>
        {todays.map((c) => (
          <li key={c.slot} className={`tt-${c.state}`}><span className="w-hint">{c.slot.split('-')[0]}</span><b className="w-ellipsis">{c.name}</b></li>
        ))}
        {todays.length === 0 && <li className="w-hint">{dayIdx < 5 ? 'Hoy no hay clases' : 'Fin de semana'}</li>}
      </ul>
    )
  }

  return (
    <div className="tt-grid" style={{ '--rows': tt.slots.length }}>
      <span />
      {DAYS.map((d, i) => <span key={d} className={`menu-day ${i === dayIdx ? 'is-today' : ''}`}>{d.slice(0, 3)}</span>)}
      {tt.slots.map((slot, r) => (
        <div key={slot} className="menu-row">
          <span className="tt-slot">{slot.split('-')[0]}</span>
          {DAYS.map((_, c) => {
            const key = `${c}-${r}`
            const isNow = c === dayIdx && slotState(slot) === 'now'
            return editing === key ? (
              <input key={key} className="tt-cell tt-input" autoFocus defaultValue={tt.cells[key] ?? ''} maxLength={20}
                onBlur={(e) => { setCell(key, e.target.value.trim()); setEditing(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(null) }} />
            ) : (
              <button key={key} className={`tt-cell ${c === dayIdx ? 'is-today' : ''} ${isNow ? 'is-now' : ''}`} onClick={() => setEditing(key)} title="Toca para editar">
                {tt.cells[key] ?? ''}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
