import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import { addDays, daysUntil, formatShort, todayISO } from '../../lib/dates.js'

const relative = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 0 ? `en ${n} días` : `hace ${-n} días`)
const short = (iso) => formatShort(iso).replace(/^\S+ /, '')

/** Ventana para crear o cambiar un hito. */
function MilestonePopup({ initial, onSave, onDelete, onClose }) {
  const [m, setM] = useState(initial)
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const ok = m.title.trim() && m.date
  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Hito">
      <div className="popup-backdrop" onClick={onClose} />
      <form className="popup-panel ms-pop" onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ ...m, title: m.title.trim() }) }}>
        <input className="te-title" autoFocus placeholder="Demo, entrega, lanzamiento…" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} maxLength={50} aria-label="Nombre del hito" />
        <label className="te-date"><Icon name="calendario" size={18} /><input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} aria-label="Fecha del hito" /></label>
        {onDelete && (
          <label className="ms-done"><input type="checkbox" checked={m.done} onChange={() => setM({ ...m, done: !m.done })} />Cumplido</label>
        )}
        <div className="ms-pop-actions">
          {onDelete && <button type="button" className="icon-btn" onClick={onDelete} aria-label="Borrar hito"><Icon name="trash" size={18} /></button>}
          <button type="button" className="pill" onClick={onClose}>Cancelar</button>
          <button className="pill pill-on" disabled={!ok}>{onDelete ? 'Guardar' : 'Añadir'}</button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

/**
 * Hitos en una línea de tiempo: del inicio del proyecto a su fecha límite, con «hoy» marcado.
 * Tocar un hito lo abre para cambiarlo; el + añade uno nuevo.
 */
export default function Milestones({ project, change, color }) {
  const today = todayISO()
  const [editing, setEditing] = useState(null) // hito abierto (o uno nuevo)
  const list = [...(project.milestones ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const next = list.find((m) => !m.done)

  const start = project.createdAt ?? [...project.tasks.map((t) => t.due).filter(Boolean), ...list.map((m) => m.date), today].sort()[0]
  const end = [project.deadline ?? addDays(today, 30), ...list.map((m) => m.date)].sort().at(-1)
  const span = Math.max(1, daysUntil(end, start))
  const pos = (iso) => Math.min(100, Math.max(0, (daysUntil(iso, start) / span) * 100))
  const at = (iso) => `${pos(iso)}%`
  // Las fechas de los extremos se esconden si un hito cae encima
  const crowdStart = list.some((m) => pos(m.date) < 9)
  const crowdEnd = list.some((m) => pos(m.date) > 91)

  const save = (m) => {
    change((p) => {
      const ms = p.milestones ?? []
      return { ...p, milestones: ms.some((x) => x.id === m.id) ? ms.map((x) => (x.id === m.id ? m : x)) : [...ms, m] }
    })
    setEditing(null)
  }
  const remove = (id) => { change((p) => ({ ...p, milestones: p.milestones.filter((m) => m.id !== id) })); setEditing(null) }

  return (
    <div className="ms-line" style={{ '--c': color }}>
      <div className="ms-head">
        <span className="wk-badge" title="Hitos"><Icon name="star" size={18} /></span>
        <span className="ms-summary">
          {next ? <>Próximo: <b>{next.title}</b> · <span className={daysUntil(next.date) < 0 ? 'is-late' : ''}>{daysUntil(next.date) < 0 ? `${-daysUntil(next.date)} días tarde` : relative(daysUntil(next.date))}</span></>
            : list.length ? <b>Todos los hitos cumplidos</b> : <span className="muted">Sin hitos todavía</span>}
        </span>
        <button className="icon-btn ms-plus" onClick={() => setEditing({ id: crypto.randomUUID(), title: '', date: '', done: false, isNew: true })} aria-label="Añadir hito" title="Añadir hito"><Icon name="plus" size={20} /></button>
      </div>

      <div className="pv-timeline">
        <span className="pv-line"><span style={{ width: at(today), background: color }} /></span>
        <span className="pv-today" style={{ left: at(today) }} title={`Hoy, ${short(today)}`} />
        {list.map((m, i) => (
          <button key={m.id} className={`pv-mile ${i % 2 ? 'below' : ''} ${pos(m.date) > 88 ? 'edge-r' : pos(m.date) < 12 ? 'edge-l' : ''} ${m.done ? 'done' : ''} ${m.date < today && !m.done ? 'late' : ''} ${m === next ? 'next' : ''}`} style={{ left: at(m.date) }}
            onClick={() => setEditing(m)} title={`${m.title} · ${formatShort(m.date)}`}>
            <span className="pv-mile-label"><b>{m.title}</b><span>{short(m.date)}</span></span>
            <span className="pv-dot" />
          </button>
        ))}
        {!crowdStart && <span className="pv-edge pv-edge-start">{short(start)}</span>}
        {!crowdEnd && <span className="pv-edge pv-edge-end">{project.deadline ? short(project.deadline) : '—'}</span>}
      </div>

      {editing && (
        <MilestonePopup initial={editing} onClose={() => setEditing(null)}
          onSave={({ isNew, ...m }) => save(m)} onDelete={editing.isNew ? null : () => remove(editing.id)} />
      )}
    </div>
  )
}
