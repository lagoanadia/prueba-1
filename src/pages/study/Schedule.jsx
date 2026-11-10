import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import { DEFAULT_BREAK, DEFAULT_CLASS, fmt, normalizeTimetable, spans, toMin } from './timetable.js'
import { SUBJECT_PALETTE, soft, tone } from './helpers.js'

// «Recreo» de horarios antiguos se ve como «Descanso»
const breakName = (l) => (!l || l === 'Recreo' ? 'Descanso' : l)
const ERASE = '__erase' // pincel que vacía casillas
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
  const [colorFor, setColorFor] = useState(null) // etiqueta cuyo color se está cambiando
  const [rowMenu, setRowMenu] = useState(null) // { id, mode: 'add' | 'grip' } de la fila con menú abierto
  const menuRef = useRef(null)
  useEffect(() => {
    if (!rowMenu) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setRowMenu(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [rowMenu])
  const [dragId, setDragId] = useState(null)
  const [editing, setEditing] = useState(false) // por defecto se ve; la cuadrícula solo al editar
  const bySubject = Object.fromEntries(subjects.map((s) => [s.short, s]))
  const byLabel = Object.fromEntries(tt.labels.map((l) => [`#${l.id}`, l]))
  const options = [...subjects.map((s) => s.short), ...tt.labels.map((l) => `#${l.id}`)]
  const look = (v) => (bySubject[v] ? { name: v, color: tone(bySubject[v].color) } : byLabel[v] ? { name: byLabel[v].name, color: tone(byLabel[v].color) } : null)

  const patch = (fn) => update((d) => ({ ...d, timetable: fn(normalizeTimetable(d.timetable, d.subjects ?? [])) }))
  // Vacío = se quita la casilla
  const setCell = (k, v) => patch((t) => { const cells = { ...t.cells }; if (v) cells[k] = v; else delete cells[k]; return { ...t, cells } })
  const click = (k) => {
    if (brush) return setCell(k, brush === ERASE ? '' : brush)
    const cycle = [...options, ''] // tras la última asignatura, la casilla vuelve a quedar vacía
    setCell(k, cycle[(cycle.indexOf(tt.cells[k] ?? '') + 1) % cycle.length])
  }
  const clearAll = () => { if (window.confirm('¿Vaciar todo el horario?')) patch((t) => ({ ...t, rows: [], cells: {} })) }
  const setEnd = (i, text) => {
    const end = toMin(text)
    if (end == null || end <= times[i].start) return
    patch((t) => ({ ...t, rows: t.rows.map((r, k) => (k === i ? { ...r, dur: end - times[i].start } : r)) }))
  }
  // Hora de inicio de una franja: la primera mueve todo el día; las demás pueden dejar un hueco antes
  const setStartAt = (i, text) => {
    const m = toMin(text)
    if (m == null) return
    if (i === 0) return patch((t) => ({ ...t, start: fmt(m) }))
    const prevEnd = times[i - 1].end
    patch((t) => ({ ...t, rows: t.rows.map((r, k) => (k === i ? { ...r, at: m > prevEnd ? fmt(m) : null } : r)) }))
  }
  const setDur = (i, dur) => { const d = Math.max(5, Math.min(240, Math.round(Number(dur) || 0))); if (d) patch((t) => ({ ...t, rows: t.rows.map((r, k) => (k === i ? { ...r, dur: d } : r)) })) }
  // Al quitar una franja, las de abajo suben y sus casillas se borran
  const removeRow = (id) => { patch((t) => ({ ...t, rows: t.rows.filter((r) => r.id !== id), cells: Object.fromEntries(Object.entries(t.cells).filter(([k]) => !k.startsWith(`${id}:`))) })); setRowMenu(null) }
  const move = (from, to) => patch((t) => { const rows = [...t.rows]; if (to < 0 || to >= rows.length) return t; const [r] = rows.splice(from, 1); rows.splice(to, 0, r); return { ...t, rows } })
  const addRowAfter = (index, kind) => {
    patch((t) => {
      const row = { id: crypto.randomUUID(), kind, dur: kind === 'class' ? DEFAULT_CLASS : DEFAULT_BREAK, ...(kind === 'class' ? {} : { label: 'Descanso' }) }
      const rows = [...t.rows]
      rows.splice(index + 1, 0, row)
      return { ...t, rows }
    })
    setRowMenu(null)
  }
  const addLabel = ({ name, color }) => { patch((t) => ({ ...t, labels: [...t.labels, { id: crypto.randomUUID(), name, color }] })); setDialog(null) }
  const removeLabel = (id) => patch((t) => ({ ...t, labels: t.labels.filter((l) => l.id !== id), cells: Object.fromEntries(Object.entries(t.cells).filter(([, v]) => v !== `#${id}`)) }))

  if (!editing) return <ScheduleView tt={tt} times={times} look={look} onEdit={() => setEditing(true)} />

  return (
    <div className="schedule">
      <div className="deliv-head"><h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Horario</h2><button className="icon-btn on sv-edit" onClick={() => setEditing(false)} aria-label="Terminar de editar" title="Listo"><Icon name="check" size={18} /></button></div>

      <div className="tt-grid">
        <div className="tt-row tt-head">
          <span /><span />
          {DAYS.map((d, i) => <span key={d} className={`tt-day ${i === today ? 'is-today' : ''}`}>{d}</span>)}
        </div>
        {tt.rows.map((row, i) => (
          <div key={row.id} className={`tt-row ${dragId === row.id ? 'is-drag' : ''}`} onDragOver={(e) => dragId && e.preventDefault()} onDrop={() => { if (dragId) { move(tt.rows.findIndex((r) => r.id === dragId), i); setDragId(null) } }}>
            <span className={`tt-hand ${rowMenu?.id === row.id ? 'open' : ''}`} ref={rowMenu?.id === row.id ? menuRef : null}>
              <button className={`tt-h-btn ${rowMenu?.id === row.id && rowMenu.mode === 'add' ? 'on' : ''}`} onClick={() => setRowMenu(rowMenu?.id === row.id && rowMenu.mode === 'add' ? null : { id: row.id, mode: 'add' })} aria-label="Añadir una franja debajo" aria-haspopup="menu" title="Añadir debajo"><Icon name="plus" size={16} /></button>
              <button className={`tt-h-btn tt-grip ${rowMenu?.id === row.id && rowMenu.mode === 'grip' ? 'on' : ''}`} draggable onDragStart={(e) => { setRowMenu(null); setDragId(row.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setDragId(null)}
                onClick={() => setRowMenu(rowMenu?.id === row.id && rowMenu.mode === 'grip' ? null : { id: row.id, mode: 'grip' })}
                onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1) } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1) } }}
                aria-label="Mover la franja (arrastra o usa las flechas) u opciones" aria-haspopup="menu" title="Arrastra para mover · pulsa para opciones"><Icon name="grip" size={16} /></button>
              {rowMenu?.id === row.id && (
                <div className="card tt-menu" role="menu">
                  {rowMenu.mode === 'add'
                    ? (<><button role="menuitem" onClick={() => addRowAfter(i, 'class')}>Franja vacía</button><button role="menuitem" onClick={() => addRowAfter(i, 'break')}>Descanso</button></>)
                    : <button role="menuitem" onClick={() => removeRow(row.id)}>Eliminar franja</button>}
                </div>
              )}
            </span>
            <span className="tt-time tt-time-edit">
              <span className="tt-times">
                <input type="time" className="tt-in tt-start" key={`s${i}${times[i].start}`} defaultValue={fmt(times[i].start).padStart(5, '0')} onBlur={(e) => setStartAt(i, e.target.value)} aria-label="Hora de inicio" />
                <span className="tt-dash">–</span>
                <input type="time" className="tt-in tt-end" key={`e${row.dur}${times[i].start}`} defaultValue={fmt(times[i].end).padStart(5, '0')} onBlur={(e) => setEnd(i, e.target.value)} aria-label="Hora de fin" />
              </span>
              <span className="tt-dur-step">
                <button type="button" className="mini" onClick={() => setDur(i, row.dur - 5)} aria-label="5 minutos menos">−</button>
                <input className="tt-dur-in" key={`d${row.dur}`} defaultValue={row.dur} inputMode="numeric" onBlur={(e) => setDur(i, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label="Duración en minutos" />
                <span className="muted">min</span>
                <button type="button" className="mini" onClick={() => setDur(i, row.dur + 5)} aria-label="5 minutos más">+</button>
              </span>
            </span>
            {row.kind === 'break'
              ? <label className="tt-break"><Icon name="clock" size={16} /><input className="tt-break-in" defaultValue={breakName(row.label)} maxLength={24} aria-label="Nombre del descanso"
                  onBlur={(e) => patch((t) => ({ ...t, rows: t.rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value.trim() || 'Descanso' } : r)) }))} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /></label>
              : DAYS.map((_, c) => {
                const k = `${row.id}:${c}`
                const v = look(tt.cells[k])
                return v
                  ? <button key={k} className="tt-box" style={{ background: v.color }} onClick={() => click(k)} title="Toca para cambiar">{v.name}</button>
                  : <button key={k} className="tt-box tt-empty" onClick={() => click(k)} aria-label="Elegir asignatura"><Icon name="plus" size={16} /></button>
              })}
          </div>
        ))}
      </div>

      <div className="tt-tools">
        {subjects.map((s) => <button key={s.id} className={`seg-chip ${brush === s.short ? 'on' : ''}`} style={{ background: tone(s.color) }} aria-pressed={brush === s.short} onClick={() => setBrush(brush === s.short ? null : s.short)}>{s.short}</button>)}
        <span className="tt-sep" />
        {tt.labels.map((l) => (
          <span key={l.id} className="seg-wrap">
            <button className={`seg-chip ${brush === `#${l.id}` ? 'on' : ''}`} style={{ background: tone(l.color) }} aria-pressed={brush === `#${l.id}`} onClick={() => setBrush(brush === `#${l.id}` ? null : `#${l.id}`)}>{l.name}</button>
            <button className="seg-color" style={{ background: l.color }} onClick={() => setColorFor(colorFor === l.id ? null : l.id)} aria-expanded={colorFor === l.id} aria-label={`Cambiar el color de la etiqueta ${l.name}`} title="Cambiar color" />
            {colorFor === l.id && (
              <>
                <span className="sc-back" onClick={() => setColorFor(null)} />
                <span className="card seg-pop" role="listbox" aria-label="Colores">
                  {['#9AA0A6', ...SUBJECT_PALETTE].map((c) => <button key={c} role="option" aria-selected={c === l.color} className={`swatch-dot ${c === l.color ? 'on' : ''}`} style={{ background: c }} aria-label={`Color ${c}`}
                    onClick={() => { patch((t) => ({ ...t, labels: t.labels.map((x) => (x.id === l.id ? { ...x, color: c } : x)) })); setColorFor(null) }} />)}
                </span>
              </>
            )}
            <button className="seg-x" onClick={() => removeLabel(l.id)} aria-label={`Borrar la etiqueta ${l.name}`}><Icon name="close" size={12} /></button>
          </span>
        ))}
        <button className={`seg-chip seg-erase ${brush === ERASE ? 'on' : ''}`} aria-pressed={brush === ERASE} onClick={() => setBrush(brush === ERASE ? null : ERASE)} title="Goma: toca casillas para vaciarlas">Goma</button>
        <button className="seg-chip seg-add" onClick={() => setDialog('label')} aria-label="Crear etiqueta" title="Crear etiqueta (p. ej. Convalidada)"><Icon name="plus" size={16} /></button>
      </div>

      <div className="tt-foot">
        <button className="pill" onClick={() => addRowAfter(tt.rows.length - 1, 'class')}>+ Franja</button>
        {(tt.rows.length > 0 || Object.keys(tt.cells).length > 0) && <button className="text-link" onClick={clearAll}>Vaciar horario</button>}
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
          {['#9AA0A6', ...SUBJECT_PALETTE].map((c) => <button type="button" key={c} className={`swatch-dot ${c === color ? 'on' : ''}`} style={{ background: tone(c) }} aria-label={`Color ${c}`} aria-pressed={c === color} onClick={() => setColor(c)} />)}
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

const ROW = 58 // alto de una franja de clase (todas iguales, duren lo que duren)
const BREAK = 22 // alto del descanso

/**
 * El horario para MIRAR: la semana como un calendario. Cada franja de clase tiene el mismo alto;
 * solo cuando hay dos o más franjas seguidas de la misma asignatura se juntan en un bloque más grande.
 */
function ScheduleView({ tt: rawTt, times: rawTimes, look, onEdit }) {
  let tt = rawTt
  let times = rawTimes
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id) }, [])
  const today = (now.getDay() + 6) % 7
  const [day, setDay] = useState(today < 5 ? today : 0) // en móvil se ve un día
  // Vacío (sin franjas o sin ninguna asignatura puesta): un lápiz grande con el texto girando alrededor
  if (!times.length || !Object.values(tt.cells).some(Boolean)) return <div className="schedule"><div className="deliv-head"><h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Horario</h2></div><EmptySchedule onEdit={onEdit} /></div>

  // Franjas de clase vacías todos los días no se dibujan: lo de abajo sube
  const used = tt.rows.map((r) => r.kind === 'break' || [0, 1, 2, 3, 4].some((c) => tt.cells[`${r.id}:${c}`]))
  tt = { ...tt, rows: tt.rows.filter((_, i) => used[i]) }
  times = times.filter((_, i) => used[i])
  // Posición de cada fila (en píxeles) según su tipo, no según sus minutos
  const tops = []
  let acc = 0
  tt.rows.forEach((r) => { tops.push(acc); acc += r.kind === 'break' ? BREAK : ROW })
  const total = acc
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowRow = times.findIndex((t) => nowMin >= t.start && nowMin < t.end)
  const nowY = nowRow === -1 ? null : tops[nowRow] + ((nowMin - times[nowRow].start) / (times[nowRow].end - times[nowRow].start)) * (tt.rows[nowRow].kind === 'break' ? BREAK : ROW)

  // Bloques de cada día: se juntan solo filas de clase seguidas con la misma asignatura
  const blocksOf = (c) => {
    const out = []
    tt.rows.forEach((row, i) => {
      if (row.kind === 'break') return
      const v = tt.cells[`${row.id}:${c}`]
      if (!v) return
      const prev = out[out.length - 1]
      if (prev && prev.v === v && prev.lastRow === i - 1) { prev.lastRow = i; prev.end = times[i].end; prev.rows += 1 }
      else out.push({ v, firstRow: i, lastRow: i, rows: 1, start: times[i].start, end: times[i].end, ...look(v) })
    })
    return out
  }
  const current = today < 5 ? blocksOf(today).find((b) => nowMin >= b.start && nowMin < b.end) : null
  const next = today < 5 ? blocksOf(today).find((b) => b.start > nowMin) : null

  return (
    <div className="schedule sv">
      <div className="deliv-head">
        <h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Horario</h2>
        {current ? <span className="sv-now" style={{ background: current.color }}>Ahora: <b>{current.name}</b> · hasta {fmt(current.end)}</span>
          : next ? <span className="sv-now">Luego: <b>{next.name}</b> a las {fmt(next.start)}</span> : null}
        <button className="icon-btn sv-edit" onClick={onEdit} aria-label="Editar horario" title="Editar"><Icon name="pen" size={18} /></button>
      </div>
      <div className="sv-days" role="tablist">
        {DAYS.map((d, i) => <button key={d} role="tab" aria-selected={day === i} className={`sv-daytab ${day === i ? 'on' : ''} ${i === today ? 'is-today' : ''}`} onClick={() => setDay(i)}>{d.slice(0, 3)}</button>)}
      </div>
      <div className="sv-grid" style={{ '--h': `${total}px` }}>
        {DAYS.map((d, c) => (
          <div key={d} className={`sv-col ${c === today ? 'is-today' : ''} ${c === day ? 'is-shown' : ''}`}>
            <span className="sv-dayname">{d}</span>
            <div className="sv-track">
              {blocksOf(c).map((b) => {
                const top = tops[b.firstRow]
                const height = tops[b.lastRow] + ROW - top - 4
                const isNow = c === today && nowMin >= b.start && nowMin < b.end
                return (
                  <div key={b.firstRow} className={`sv-block ${b.rows > 1 ? 'is-double' : ''} ${isNow ? 'is-now' : ''}`} style={{ top: top + 2, height, background: b.color }}>
                    <b>{b.name}</b><span>{fmt(b.start)}–{fmt(b.end)}</span>
                  </div>
                )
              })}
              {c === today && nowY != null && <span className="sv-line" style={{ top: nowY }} />}
            </div>
          </div>
        ))}
        {tt.rows.map((r, i) => r.kind === 'break' ? <div key={r.id} className="sv-break-full" style={{ top: `calc(var(--pt) + ${tops[i]}px)`, height: BREAK }}>{breakName(r.label)}</div> : null)}
      </div>
    </div>
  )
}

/** Estado vacío: círculo con el lápiz en el centro y «AÑADE TU HORARIO» escrito alrededor. */
function EmptySchedule({ onEdit }) {
  const text = 'AÑADE TU HORARIO · AÑADE TU HORARIO · '
  return (
    <button className="sv-empty" onClick={onEdit} aria-label="Añade tu horario">
      <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
        <defs><path id="sv-ring" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0" /></defs>
        <g className="sv-empty-ring"><text><textPath href="#sv-ring" textLength="490">{text}</textPath></text></g>
        <circle cx="100" cy="100" r="60" fill="#E3EEFF" />
        <g transform="translate(64 64) scale(3)" fill="none" stroke="#202124" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20L5 15L16 4L20 8L9 19Z" fill="#F9DC5C" /><path d="M14 6L18 10" />
        </g>
      </svg>
    </button>
  )
}
