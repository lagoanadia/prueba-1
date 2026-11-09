import { useEffect, useRef, useState } from 'react'
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
  const [dialog, setDialog] = useState(null) // 'label'
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])
  const [dragId, setDragId] = useState(null)
  const [editing, setEditing] = useState(false) // por defecto se ve; la cuadrícula solo al editar
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
  const addRow = (kind) => {
    patch((t) => ({ ...t, rows: [...t.rows, { id: crypto.randomUUID(), kind, dur: kind === 'class' ? DEFAULT_CLASS : DEFAULT_BREAK, ...(kind === 'class' ? {} : { label: 'Recreo' }) }] }))
    setMenu(false)
  }
  const addLabel = ({ name, color }) => { patch((t) => ({ ...t, labels: [...t.labels, { id: crypto.randomUUID(), name, color }] })); setDialog(null) }
  const removeLabel = (id) => patch((t) => ({ ...t, labels: t.labels.filter((l) => l.id !== id), cells: Object.fromEntries(Object.entries(t.cells).filter(([, v]) => v !== `#${id}`)) }))

  if (!editing) return <ScheduleView tt={tt} times={times} look={look} onEdit={() => setEditing(true)} />

  return (
    <div className="schedule">
      <div className="deliv-head"><h2 className="page-h2">Horario</h2><button className="icon-btn on sv-edit" onClick={() => setEditing(false)} aria-label="Terminar de editar" title="Listo"><Icon name="check" size={18} /></button></div>

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
        {subjects.map((s) => <button key={s.id} className={`seg-chip ${brush === s.short ? 'on' : ''}`} style={{ background: soft(s.color) }} aria-pressed={brush === s.short} onClick={() => setBrush(brush === s.short ? null : s.short)}>{s.short}</button>)}
        <span className="tt-sep" />
        {tt.labels.map((l) => (
          <span key={l.id} className="seg-wrap">
            <button className={`seg-chip ${brush === `#${l.id}` ? 'on' : ''}`} style={{ background: soft(l.color, 40) }} aria-pressed={brush === `#${l.id}`} onClick={() => setBrush(brush === `#${l.id}` ? null : `#${l.id}`)}>{l.name}</button>
            <button className="seg-x" onClick={() => removeLabel(l.id)} aria-label={`Borrar la etiqueta ${l.name}`}><Icon name="close" size={12} /></button>
          </span>
        ))}
        <span className="seg-wrap" ref={menuRef}>
          <button className="seg-chip seg-add" onClick={() => setMenu(!menu)} aria-label="Añadir" aria-haspopup="menu" aria-expanded={menu} title="Añadir etiqueta, franja o recreo"><Icon name="plus" size={16} /></button>
          {menu && (
            <div className="card tt-menu" role="menu">
              <button role="menuitem" onClick={() => { setMenu(false); setDialog('label') }}>Añadir etiqueta</button>
              <button role="menuitem" onClick={() => addRow('class')}>Añadir franja vacía</button>
              <button role="menuitem" onClick={() => addRow('break')}>Añadir recreo</button>
            </div>
          )}
        </span>
      </div>

      {dialog === 'label' && <LabelDialog onSubmit={addLabel} onClose={() => setDialog(null)} />}
    </div>
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

const PX = 1.15 // píxeles por minuto

/**
 * El horario para MIRAR: la semana como un calendario. Cada clase es un bloque del color de su asignatura
 * con su duración real; las horas seguidas de la misma asignatura se juntan. Sin casillas vacías.
 */
function ScheduleView({ tt, times, look, onEdit }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id) }, [])
  const today = (now.getDay() + 6) % 7
  const [day, setDay] = useState(today < 5 ? today : 0) // en móvil se ve un día
  if (!times.length) return <div className="schedule"><div className="deliv-head"><h2 className="page-h2">Horario</h2><button className="icon-btn sv-edit" onClick={onEdit} aria-label="Editar horario"><Icon name="pen" size={18} /></button></div><p className="muted">Pulsa el lápiz para crear tu horario.</p></div>
  const first = times[0].start
  const last = times[times.length - 1].end
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const y = (m) => (m - first) * PX

  // Bloques de cada día: juntar filas seguidas con lo mismo
  const blocksOf = (c) => {
    const out = []
    tt.rows.forEach((row, i) => {
      if (row.kind === 'break') return
      const v = tt.cells[`${row.id}:${c}`]
      const prev = out[out.length - 1]
      if (!v) return
      if (prev && prev.v === v && prev.end === times[i].start) prev.end = times[i].end
      else out.push({ v, start: times[i].start, end: times[i].end, ...look(v) })
    })
    return out
  }
  const breaks = tt.rows.map((r, i) => (r.kind === 'break' ? { ...times[i], label: r.label } : null)).filter(Boolean)
  const current = today < 5 ? blocksOf(today).find((b) => nowMin >= b.start && nowMin < b.end) : null
  const next = today < 5 ? blocksOf(today).find((b) => b.start > nowMin) : null
  const hours = []
  for (let h = Math.ceil(first / 60) * 60; h <= last; h += 60) hours.push(h)

  return (
    <div className="schedule sv">
      <div className="deliv-head">
        <h2 className="page-h2">Horario</h2>
        {current ? <span className="sv-now" style={{ background: current.color }}>Ahora: <b>{current.name}</b> · hasta {fmt(current.end)}</span>
          : next ? <span className="sv-now">Luego: <b>{next.name}</b> a las {fmt(next.start)}</span> : null}
        <button className="icon-btn sv-edit" onClick={onEdit} aria-label="Editar horario" title="Editar"><Icon name="pen" size={18} /></button>
      </div>
      <div className="sv-days" role="tablist">
        {DAYS.map((d, i) => <button key={d} role="tab" aria-selected={day === i} className={`sv-daytab ${day === i ? 'on' : ''} ${i === today ? 'is-today' : ''}`} onClick={() => setDay(i)}>{d.slice(0, 3)}</button>)}
      </div>
      <div className="sv-grid" style={{ '--h': `${(last - first) * PX}px` }}>
        <div className="sv-hours">{hours.map((h) => <span key={h} style={{ top: y(h) }}>{fmt(h)}</span>)}</div>
        {DAYS.map((d, c) => (
          <div key={d} className={`sv-col ${c === today ? 'is-today' : ''} ${c === day ? 'is-shown' : ''}`}>
            <span className="sv-dayname">{d}</span>
            <div className="sv-track">
              {breaks.map((b) => <span key={b.start} className="sv-break" style={{ top: y(b.start), height: (b.end - b.start) * PX }} title={b.label} />)}
              {blocksOf(c).map((b) => {
                const isNow = c === today && nowMin >= b.start && nowMin < b.end
                return (
                  <div key={b.start} className={`sv-block ${isNow ? 'is-now' : ''}`} style={{ top: y(b.start), height: (b.end - b.start) * PX - 3, background: b.color }}>
                    <b>{b.name}</b><span>{fmt(b.start)}–{fmt(b.end)}</span>
                  </div>
                )
              })}
              {c === today && nowMin >= first && nowMin <= last && <span className="sv-line" style={{ top: y(nowMin) }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
