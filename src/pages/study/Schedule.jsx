import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import { DEFAULT_BREAK, DEFAULT_CLASS, fmt, normalizeTimetable, spans, toMin } from './timetable.js'
import { SUBJECT_COLORS, soft } from './helpers.js'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

/**
 * Horario editable. Cada fila dura lo que tú quieras (por defecto 50 min); las horas se encadenan solas:
 * cambia la hora de fin de una fila y las siguientes se reajustan. Las filas se mueven con el asa.
 * Cada casilla es una asignatura o una etiqueta tuya (p. ej. «Convalidada») que no cuenta como asignatura.
 */
export default function Schedule({ data, update, subjects }) {
  const tt = normalizeTimetable(data.timetable, subjects)
  const times = spans(tt)
  const today = (new Date().getDay() + 6) % 7
  const [brush, setBrush] = useState(null)
  const [dialog, setDialog] = useState(null) // 'row' | 'label'
  const [dragId, setDragId] = useState(null)
  const bySubject = Object.fromEntries(subjects.map((s) => [s.short, s]))
  const byLabel = Object.fromEntries(tt.labels.map((l) => [`#${l.id}`, l]))
  const options = [...subjects.map((s) => s.short), ...tt.labels.map((l) => `#${l.id}`)]
  const look = (v) => (bySubject[v] ? { name: v, color: soft(bySubject[v].color) } : byLabel[v] ? { name: byLabel[v].name, color: soft(byLabel[v].color, 40) } : null)

  const patch = (fn) => update((d) => ({ ...d, timetable: fn(normalizeTimetable(d.timetable, d.subjects ?? [])) }))
  const setCell = (k, v) => patch((t) => ({ ...t, cells: { ...t.cells, [k]: v } }))
  const click = (k) => {
    if (brush) return setCell(k, brush)
    if (!options.length) return
    setCell(k, options[(options.indexOf(tt.cells[k]) + 1) % options.length]) // nunca queda en blanco
  }
  const setEnd = (i, text) => {
    const end = toMin(text)
    if (end == null || end <= times[i].start) return
    patch((t) => ({ ...t, rows: t.rows.map((r, k) => (k === i ? { ...r, dur: end - times[i].start } : r)) }))
  }
  const setStart = (text) => { const m = toMin(text); if (m != null) patch((t) => ({ ...t, start: fmt(m) })) }
  const removeRow = (id) => patch((t) => ({ ...t, rows: t.rows.filter((r) => r.id !== id) }))
  const move = (from, to) => patch((t) => { const rows = [...t.rows]; if (to < 0 || to >= rows.length) return t; const [r] = rows.splice(from, 1); rows.splice(to, 0, r); return { ...t, rows } })
  const addRow = ({ kind, label, end }) => {
    const last = times.length ? times[times.length - 1].end : toMin(tt.start) ?? 510
    const dur = end != null && end > last ? end - last : kind === 'class' ? DEFAULT_CLASS : DEFAULT_BREAK
    patch((t) => {
      const row = { id: crypto.randomUUID(), kind: kind === 'class' ? 'class' : 'break', dur, ...(kind === 'class' ? {} : { label }) }
      const cells = { ...t.cells }
      if (row.kind === 'class' && options.length) DAYS.forEach((_, c) => { cells[`${row.id}:${c}`] = brush ?? options[0] })
      return { ...t, rows: [...t.rows, row], cells }
    })
    setDialog(null)
  }
  const addLabel = ({ name, color }) => { patch((t) => ({ ...t, labels: [...t.labels, { id: crypto.randomUUID(), name, color }] })); setDialog(null) }
  const removeLabel = (id) => patch((t) => ({ ...t, labels: t.labels.filter((l) => l.id !== id), cells: Object.fromEntries(Object.entries(t.cells).filter(([, v]) => v !== `#${id}`)) }))

  if (!subjects.length) return <div className="schedule"><div className="deliv-head"><h2 className="page-h2">Horario</h2></div><p className="muted">Añade tus asignaturas para construir el horario.</p></div>

  return (
    <div className="schedule">
      <div className="deliv-head">
        <h2 className="page-h2">Horario</h2>
        <button className="icon-btn" onClick={() => setDialog('row')} aria-label="Añadir franja" title="Añadir franja"><Icon name="plus" size={22} /></button>
      </div>

      <div className="tt-grid">
        <div className="tt-row tt-head">
          <span /><span />
          {DAYS.map((d, i) => <span key={d} className={`tt-day ${i === today ? 'is-today' : ''}`}>{d}</span>)}
        </div>
        {tt.rows.map((row, i) => (
          <div key={row.id} className={`tt-row ${dragId === row.id ? 'is-drag' : ''}`} onDragOver={(e) => dragId && e.preventDefault()} onDrop={() => { if (dragId) { move(tt.rows.findIndex((r) => r.id === dragId), i); setDragId(null) } }}>
            <button className="tt-grip" draggable onDragStart={(e) => { setDragId(row.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setDragId(null)}
              onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1) } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1) } }}
              aria-label="Mover fila (arrastra o usa las flechas)" title="Arrastra para mover"><Icon name="grip" size={18} /></button>
            <span className="tt-time">
              <span className="tt-times">
                {i === 0
                  ? <input className="tt-in tt-start" key={`s${tt.start}`} defaultValue={fmt(times[0].start)} onBlur={(e) => setStart(e.target.value)} aria-label="Hora de inicio" maxLength={5} />
                  : <span className="tt-start-text">{fmt(times[i].start)}</span>}
                <span className="tt-dash">–</span>
                <input className="tt-in tt-end" key={`e${row.dur}${times[i].start}`} defaultValue={fmt(times[i].end)} onBlur={(e) => setEnd(i, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label="Hora de fin" maxLength={5} />
              </span>
              <span className="tt-dur">{row.dur} min</span>
              <button className="prio-x tt-del" onClick={() => removeRow(row.id)} aria-label="Quitar fila"><Icon name="close" size={14} /></button>
            </span>
            {row.kind === 'break'
              ? <span className="tt-break"><Icon name="clock" size={16} /> {row.label}</span>
              : DAYS.map((_, c) => {
                const k = `${row.id}:${c}`
                const v = look(tt.cells[k])
                return v
                  ? <button key={k} className="tt-box" style={{ background: v.color }} onClick={() => click(k)} title="Toca para cambiar">{v.name}</button>
                  : <button key={k} className="tt-box tt-empty" onClick={() => click(k)} aria-label="Elegir asignatura"><Icon name="plus" size={16} /></button>
              })}
          </div>
        ))}
        {tt.rows.length === 0 && <p className="muted">Pulsa + para añadir la primera franja.</p>}
      </div>

      <div className="tt-tools">
        <span className="tt-tool-ic" title="Pincel: elige y pinta casillas" aria-label="Pincel"><Icon name="marker" size={18} /></span>
        {subjects.map((s) => <button key={s.id} className={`seg-chip ${brush === s.short ? 'on' : ''}`} style={{ background: soft(s.color) }} aria-pressed={brush === s.short} onClick={() => setBrush(brush === s.short ? null : s.short)}>{s.short}</button>)}
        <span className="tt-sep" />
        {tt.labels.map((l) => (
          <span key={l.id} className="seg-wrap">
            <button className={`seg-chip ${brush === `#${l.id}` ? 'on' : ''}`} style={{ background: soft(l.color, 40) }} aria-pressed={brush === `#${l.id}`} onClick={() => setBrush(brush === `#${l.id}` ? null : `#${l.id}`)}>{l.name}</button>
            <button className="seg-x" onClick={() => removeLabel(l.id)} aria-label={`Borrar la etiqueta ${l.name}`}><Icon name="close" size={12} /></button>
          </span>
        ))}
        <button className="seg-chip seg-add" onClick={() => setDialog('label')} aria-label="Crear etiqueta" title="Crear etiqueta (p. ej. Convalidada)"><Icon name="plus" size={16} /></button>
      </div>

      {dialog === 'row' && <RowDialog start={times.length ? times[times.length - 1].end : toMin(tt.start) ?? 510} onSubmit={addRow} onClose={() => setDialog(null)} />}
      {dialog === 'label' && <LabelDialog onSubmit={addLabel} onClose={() => setDialog(null)} />}
    </div>
  )
}


/** Ventana para añadir una franja: Clase, Recreo u Otra (con nombre) y hasta qué hora dura. */
function RowDialog({ start, onSubmit, onClose }) {
  const [kind, setKind] = useState('class')
  const [label, setLabel] = useState('')
  const [end, setEnd] = useState(fmt(start + DEFAULT_CLASS))
  const [touched, setTouched] = useState(false)
  const pick = (k) => { setKind(k); if (!touched) setEnd(fmt(start + (k === 'class' ? DEFAULT_CLASS : DEFAULT_BREAK))) }
  const endMin = toMin(end)
  const dur = endMin != null && endMin > start ? endMin - start : null
  const name = kind === 'break' ? 'Recreo' : label.trim()
  const ok = dur && (kind !== 'other' || name)
  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Añadir franja" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="popup-backdrop" onClick={onClose} />
      <form className="card name-dialog" onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit({ kind, label: name, end: endMin }) }}>
        <div className="seg-row" role="radiogroup" aria-label="Tipo de franja">
          {[['class', 'Clase'], ['break', 'Recreo'], ['other', 'Otra']].map(([k, t]) => <button type="button" key={k} role="radio" aria-checked={kind === k} className={`seg-chip ${kind === k ? 'on' : ''}`} onClick={() => pick(k)}>{t}</button>)}
        </div>
        {kind === 'other' && <input className="pill-input" autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nombre (Comida, Tutoría…)" maxLength={30} aria-label="Nombre de la franja" />}
        <label className="end-row"><span className="muted">Acaba a las</span>
          <input className="tt-in tt-end" value={end} onChange={(e) => { setEnd(e.target.value); setTouched(true) }} maxLength={5} aria-label="Hora de fin" aria-invalid={!dur} />
          <span className="tt-dur">{dur ? `${dur} min` : 'Hora no válida'}</span>
        </label>
        <div className="name-dialog-actions">
          <button type="button" className="icon-btn name-x" onClick={onClose} aria-label="Cancelar"><Icon name="close" size={22} /></button>
          <button className="icon-btn on" disabled={!ok} aria-label="Añadir"><Icon name="check" size={22} /></button>
        </div>
      </form>
    </div>,
    document.body
  )
}

/** Ventana para crear una etiqueta (no es una asignatura: no sale en las tarjetas ni cuenta en el progreso). */
function LabelDialog({ onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#9AA0A6')
  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Nueva etiqueta" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="popup-backdrop" onClick={onClose} />
      <form className="card name-dialog" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit({ name: name.trim(), color }) }}>
        <b className="name-dialog-title">Nombre de la etiqueta</b>
        <input className="pill-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Convalidada" maxLength={20} aria-label="Nombre de la etiqueta" />
        <div className="seg-row">
          {['#9AA0A6', ...SUBJECT_COLORS].map((c) => <button type="button" key={c} className={`swatch-dot ${c === color ? 'on' : ''}`} style={{ background: soft(c, 40) }} aria-label={`Color ${c}`} aria-pressed={c === color} onClick={() => setColor(c)} />)}
        </div>
        <div className="name-dialog-actions">
          <button type="button" className="icon-btn name-x" onClick={onClose} aria-label="Cancelar"><Icon name="close" size={22} /></button>
          <button className="icon-btn on" disabled={!name.trim()} aria-label="Crear"><Icon name="check" size={22} /></button>
        </div>
      </form>
    </div>,
    document.body
  )
}
