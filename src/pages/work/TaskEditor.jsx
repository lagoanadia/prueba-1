import Select from '../../components/Select.jsx'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import { STATES, projectsOf } from '../../widgets/trabajo/projects.js'
import { colorOf, soft } from './shared.js'

const PRIORITY = [['baja', '#3DDC97'], ['media', '#F9DC5C'], ['alta', '#E84855']]
const STATE_ICON = { todo: 'list', doing: 'clock', done: 'check' }

/**
 * Ficha de una tarea: todo editable al momento (título, notas, estado, prioridad, fecha,
 * proyecto y subtareas). Cambiar de proyecto la mueve a ese proyecto.
 */
export default function TaskEditor({ data, update, projectId, taskId, onClose }) {
  const project = projectsOf(data).find((p) => p.id === projectId)
  const task = project?.tasks.find((t) => t.id === taskId)
  const [sub, setSub] = useState('')
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  if (!task) return null

  const set = (changes) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id !== projectId ? p : { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...changes } : t)) })) }))
  const moveTo = (newId) => update((d) => ({
    ...d,
    projects: d.projects.map((p) => (p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p.id === newId ? { ...p, tasks: [...p.tasks, task] } : p)),
  }))
  const remove = () => { update((d) => ({ ...d, projects: d.projects.map((p) => (p.id !== projectId ? p : { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) })) })); onClose() }
  const subtasks = task.subtasks ?? []
  const addSub = (e) => { e.preventDefault(); if (!sub.trim()) return; set({ subtasks: [...subtasks, { id: crypto.randomUUID(), text: sub.trim(), done: false }] }); setSub('') }
  const c = colorOf(data, projectId)

  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Tarea">
      <div className="popup-backdrop" onClick={onClose} />
      <div className="popup-panel task-editor" style={{ '--c': c }}>
        <div className="te-top">
          <Select className="te-project" value={projectId} label="Proyecto" onChange={(v) => { moveTo(v); onClose() }} options={projectsOf(data).map((p) => ({ value: p.id, label: p.name, color: colorOf(data, p.id) }))} />
          <button className="icon-btn" onClick={remove} aria-label="Borrar tarea" title="Borrar"><Icon name="trash" size={18} /></button>
          <button className="icon-btn on" onClick={onClose} aria-label="Cerrar" title="Listo"><Icon name="check" size={18} /></button>
        </div>

        <textarea className="te-title" value={task.title} rows={1} onChange={(e) => set({ title: e.target.value.replace(/\n/g, '') })} maxLength={120} aria-label="Título" />

        <div className="te-row" role="radiogroup" aria-label="Estado">
          {STATES.map((s) => (
            <button key={s.id} role="radio" aria-checked={task.status === s.id} className={`seg-chip te-state te-${s.id} ${task.status === s.id ? 'on' : ''}`}
              onClick={() => set({ status: s.id, doneAt: s.id === 'done' ? new Date().toLocaleDateString('en-CA') : null })}>
              <Icon name={STATE_ICON[s.id]} size={16} />{s.label}
            </button>
          ))}
        </div>

        <div className="te-row">
          <span className="te-prios" role="radiogroup" aria-label="Prioridad">
            {PRIORITY.map(([id, col]) => (
              <button key={id} role="radio" aria-checked={task.priority === id} className={`te-prio ${task.priority === id ? 'on' : ''}`} style={{ background: col }} onClick={() => set({ priority: id })} title={`Prioridad ${id}`} aria-label={`Prioridad ${id}`} />
            ))}
          </span>
          <label className="te-date">
            <Icon name="calendario" size={18} />
            <input type="date" value={task.due ?? ''} onChange={(e) => set({ due: e.target.value || null })} aria-label="Fecha" />
          </label>
        </div>

        <textarea className="te-notes" placeholder="Notas, enlaces, detalles…" value={task.notes ?? ''} rows={3} onChange={(e) => set({ notes: e.target.value })} maxLength={2000} aria-label="Notas" />

        <ul className="te-subs">
          {subtasks.map((s) => (
            <li key={s.id}>
              <label><input type="checkbox" checked={s.done} onChange={() => set({ subtasks: subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })} /><span className={s.done ? 'is-clear' : ''}>{s.text}</span></label>
              <button className="wk-x" onClick={() => set({ subtasks: subtasks.filter((x) => x.id !== s.id) })} aria-label={`Quitar ${s.text}`}><Icon name="close" size={12} /></button>
            </li>
          ))}
        </ul>
        <form onSubmit={addSub}><input className="line-input" placeholder="+ Subtarea" value={sub} onChange={(e) => setSub(e.target.value)} maxLength={80} /></form>
      </div>
    </div>,
    document.body,
  )
}
