import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { soft } from './helpers.js'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const slotTime = (s) => (typeof s === 'string' ? s : s.time)

/**
 * Horario editable: franjas que se pueden cambiar, añadir y quitar. Cada casilla es SIEMPRE una de tus
 * asignaturas (con su color): se pinta eligiendo una asignatura abajo (pincel) o tocando la casilla para cambiarla.
 */
export default function Schedule({ data, update, subjects }) {
  const tt = data.timetable ?? { slots: [], cells: {} }
  const today = (new Date().getDay() + 6) % 7
  const [brush, setBrush] = useState(null)
  const byShort = Object.fromEntries(subjects.map((s) => [s.short, s]))
  const patch = (fn) => update((d) => ({ ...d, timetable: fn(d.timetable ?? { slots: [], cells: {} }) }))

  const setCell = (k, value) => patch((t) => ({ ...t, cells: { ...t.cells, [k]: value } }))
  const click = (k) => {
    const cur = tt.cells[k]
    if (brush) return setCell(k, brush)
    // sin pincel: pasa a la siguiente asignatura (nunca queda en blanco)
    const i = subjects.findIndex((s) => s.short === cur)
    setCell(k, subjects[(i + 1) % subjects.length].short)
  }
  const addSlot = (isBreak) => patch((t) => {
    const last = t.slots.length ? slotTime(t.slots[t.slots.length - 1]).split('-')[1] : '8:00'
    const [h, m] = last.split(':').map(Number)
    const end = h * 60 + m + (isBreak ? 20 : 55)
    const time = `${last}-${Math.floor(end / 60)}:${String(end % 60).padStart(2, '0')}`
    const r = t.slots.length
    const cells = { ...t.cells }
    if (!isBreak && subjects.length) DAYS.forEach((_, c) => { cells[`${c}-${r}`] = brush ?? subjects[0].short })
    return { ...t, cells, slots: [...t.slots, isBreak ? { time, label: 'Recreo' } : time] }
  })
  const removeSlot = (r) => patch((t) => {
    const cells = {}
    Object.entries(t.cells).forEach(([k, v]) => { const [c, row] = k.split('-').map(Number); if (row < r) cells[k] = v; else if (row > r) cells[`${c}-${row - 1}`] = v })
    return { ...t, cells, slots: t.slots.filter((_, i) => i !== r) }
  })
  const setTime = (r, time) => patch((t) => ({ ...t, slots: t.slots.map((s, i) => (i !== r || !time.trim() ? s : typeof s === 'string' ? time.trim() : { ...s, time: time.trim() })) }))

  if (!subjects.length) return <div className="schedule"><h2 className="page-h2">Horario</h2><p className="muted">Añade tus asignaturas para construir el horario.</p></div>

  return (
    <div className="schedule">
      <h2 className="page-h2">Horario</h2>
      <div className="timetable">
        <span />
        {DAYS.map((d, i) => <span key={d} className={`tt-day ${i === today ? 'is-today' : ''}`}>{d}</span>)}
        {tt.slots.map((slot, r) => (
          <div key={r} className="tt-line">
            <span className="tt-time">
              <input aria-label="Franja horaria" defaultValue={slotTime(slot)} onBlur={(e) => setTime(r, e.target.value)} maxLength={13} />
              <button className="prio-x" onClick={() => removeSlot(r)} aria-label="Quitar franja"><Icon name="close" size={14} /></button>
            </span>
            {typeof slot === 'object'
              ? <span className="tt-break"><Icon name="clock" size={16} /> {slot.label}</span>
              : DAYS.map((_, c) => {
                const k = `${c}-${r}`
                const s = byShort[tt.cells[k]]
                return s
                  ? <button key={k} className="tt-box" style={{ background: soft(s.color) }} onClick={() => click(k)} title="Toca para cambiar la asignatura">{s.short}</button>
                  : <button key={k} className="tt-box tt-empty" onClick={() => click(k)} aria-label="Elegir asignatura"><Icon name="plus" size={16} /></button>
              })}
          </div>
        ))}
      </div>
      <div className="tt-tools">
        <span className="muted" id="brush-l">Pincel</span>
        {subjects.map((s) => (
          <button key={s.id} className={`seg-chip ${brush === s.short ? 'on' : ''}`} style={{ background: soft(s.color) }} aria-pressed={brush === s.short} onClick={() => setBrush(brush === s.short ? null : s.short)}>{s.short}</button>
        ))}
        <button className="icon-btn" onClick={() => addSlot(false)} aria-label="Añadir franja" title="Añadir franja"><Icon name="plus" size={20} /></button>
        <button className="pill pill-sm" onClick={() => addSlot(true)}>Recreo</button>
      </div>
    </div>
  )
}
