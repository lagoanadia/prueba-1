import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import { addDays, daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { proposeTasksFromNotes } from '../../services/organizeService.js'
import Timeline from './Timeline.jsx'

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

/** Un hito abierto: notas libres → la IA las ordena en puntos → tú eliges cuáles pasan a pendientes (la IA solo propone). */
function MilestonePanel({ project, m, change, onEdit, onClose }) {
  const [notes, setNotes] = useState(m.notes ?? '')
  const [prop, setProp] = useState(null) // [{ id, text, on }]
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const linked = project.tasks.filter((t) => t.milestoneId === m.id)
  const saveNotes = () => notes !== (m.notes ?? '') && change((p) => ({ ...p, milestones: p.milestones.map((x) => (x.id === m.id ? { ...x, notes } : x)) }))
  const order = async () => {
    if (!notes.trim()) return
    saveNotes(); setBusy(true); setErr('')
    try { const { tasks } = await proposeTasksFromNotes(project.name, m.title, notes); setProp(tasks.map((text) => ({ id: crypto.randomUUID(), text, on: true }))) }
    catch (e) { setErr(e.message || 'No se ha podido ordenar') } finally { setBusy(false) }
  }
  const chosen = (prop ?? []).filter((x) => x.on && x.text.trim())
  const add = () => {
    change((p) => ({ ...p, tasks: [...p.tasks, ...chosen.map((x) => ({ id: crypto.randomUUID(), title: x.text.trim(), priority: 'media', due: m.date || null, status: 'todo', milestoneId: m.id }))] }))
    setProp(null)
  }
  const set = (id, patch) => setProp(prop.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  return (
    <div className="ms-panel" role="region" aria-label={`Hito ${m.title}`}>
      <div className="ms-panel-head"><b>{m.title}</b><span className="muted">{short(m.date)}</span><span className="ms-grow" />
        <button className="icon-btn" onClick={onEdit} aria-label="Cambiar el hito" title="Cambiar el hito"><Icon name="pen" size={16} /></button>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar el hito"><Icon name="close" size={16} /></button></div>
      <textarea className="ms-notes" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3} maxLength={4000} placeholder="Apunta lo que hay que hacer, tal cual te salga…" aria-label="Notas del hito" />
      <div className="ms-panel-actions">
        <button className="pill sh-save" onClick={order} disabled={busy || !notes.trim()}><Icon name="star" size={15} color="#fff" />{busy ? 'Ordenando…' : 'Ordenar con IA'}</button>
        {err && <span className="wk-err" role="alert">{err}</span>}
      </div>
      {prop && (
        <div className="ms-prop">
          <span className="muted">Propuesta: tú decides qué pasa a pendientes</span>
          {prop.map((x) => (
            <div key={x.id} className={`ms-prop-it ${x.on ? '' : 'is-off'}`}>
              <button type="button" className={`ms-chk ${x.on ? 'on' : ''}`} onClick={() => set(x.id, { on: !x.on })} aria-pressed={x.on} aria-label={x.on ? 'Quitar de la lista' : 'Incluir'}>{x.on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}</button>
              <input value={x.text} maxLength={90} onChange={(e) => set(x.id, { text: e.target.value })} aria-label="Tarea" />
            </div>
          ))}
          <button type="button" className="ms-more" onClick={() => setProp([...prop, { id: crypto.randomUUID(), text: '', on: true }])}><Icon name="plus" size={14} />Añadir otra</button>
          <div className="ms-panel-actions">
            <button className="pill" onClick={() => setProp(null)}>Cancelar</button>
            <button className="pill sh-save" onClick={add} disabled={!chosen.length}>Añadir {chosen.length} a pendientes</button>
          </div>
        </div>
      )}
      {linked.length > 0 && (
        <ul className="ms-linked" aria-label="Tareas de este hito">
          {linked.map((t) => <li key={t.id} className={t.status === 'done' ? 'is-done' : ''}><Icon name="check" size={13} />{t.title}</li>)}
        </ul>
      )}
    </div>
  )
}

/**
 * Hitos en una línea de tiempo: del inicio del proyecto a su fecha límite, con «hoy» marcado.
 * Tocar un hito lo abre para cambiarlo; el + añade uno nuevo.
 */
export default function Milestones({ project, change, color }) {
  const today = todayISO()
  const [editing, setEditing] = useState(null) // hito que se está cambiando (o uno nuevo)
  const [openId, setOpenId] = useState(null) // hito desplegado
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

      <Timeline data={{ projects: [project] }} labels openId={openId} onMilestone={(m) => setOpenId(openId === m.id ? null : m.id)} />

      {list.find((m) => m.id === openId) && (
        <MilestonePanel key={openId} project={project} m={list.find((m) => m.id === openId)} change={change} onEdit={() => setEditing(list.find((m) => m.id === openId))} onClose={() => setOpenId(null)} />
      )}

      {editing && (
        <MilestonePopup initial={editing} onClose={() => setEditing(null)}
          onSave={({ isNew, ...m }) => save(m)} onDelete={editing.isNew ? null : () => remove(editing.id)} />
      )}
    </div>
  )
}
