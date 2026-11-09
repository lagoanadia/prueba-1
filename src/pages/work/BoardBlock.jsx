import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'
import { STATES, projectsOf, updateTask } from '../../widgets/trabajo/projects.js'
import { colorOf, selectedOf, soft } from './shared.js'

const PRIORITY = { alta: '#E84855', media: '#F9DC5C', baja: '#3DDC97' }
const NEXT_PRIORITY = { baja: 'media', media: 'alta', alta: 'baja' }
const NEXT_STATE = { todo: 'doing', doing: 'done', done: 'todo' }
const STATE_ICON = { todo: 'list', doing: 'clock', done: 'check' }

/** Tablero con las tareas de los proyectos encendidos (mezclados, cada una con el color de su proyecto). */
export default function BoardBlock({ data, update, onlyProject = null }) {
  const today = todayISO()
  const projects = projectsOf(data)
  const selected = onlyProject ? [onlyProject] : selectedOf(data)
  const shown = projects.filter((p) => selected.includes(p.id))
  const mixed = shown.length > 1
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [target, setTarget] = useState('')
  const projectFor = shown.find((p) => p.id === target) ?? shown[0]

  const tasks = shown.flatMap((p) => p.tasks.map((t) => ({ ...t, projectId: p.id, projectName: p.name })))
  const add = (e) => {
    e.preventDefault()
    if (!title.trim() || !projectFor) return
    const t = { id: crypto.randomUUID(), title: title.trim(), priority: 'media', due: due || null, status: 'todo' }
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === projectFor.id ? { ...p, tasks: [...p.tasks, t] } : p)) }))
    setTitle('')
    setDue('')
  }
  const advance = (t) => update((d) => updateTask(d, t.projectId, t.id, { status: NEXT_STATE[t.status], doneAt: NEXT_STATE[t.status] === 'done' ? today : null }))
  const cyclePriority = (t) => update((d) => updateTask(d, t.projectId, t.id, { priority: NEXT_PRIORITY[t.priority] }))
  const remove = (t) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id !== t.projectId ? p : { ...p, tasks: p.tasks.filter((x) => x.id !== t.id) })) }))

  if (!projects.length) return <p className="muted wk-empty"><Icon name="trabajo" size={20} /> Crea un proyecto para empezar</p>

  return (
    <div className="wk-board">
      <form className="wk-taskform" onSubmit={add}>
        {mixed && (
          <select value={projectFor?.id} onChange={(e) => setTarget(e.target.value)} aria-label="Proyecto" style={{ background: soft(colorOf(data, projectFor?.id), 30) }}>
            {shown.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <input placeholder="Nueva tarea" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Nueva tarea" />
        <label className={`icon-btn wk-date ${due ? 'on' : ''}`} title={due ? formatShort(due) : 'Fecha'}>
          <Icon name="calendario" size={18} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fecha de la tarea" />
        </label>
        <button className="icon-btn on" disabled={!title.trim()} aria-label="Añadir tarea"><Icon name="plus" size={20} /></button>
      </form>

      <div className="wk-cols">
        {STATES.map((s) => {
          const list = tasks.filter((t) => t.status === s.id).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'))
          return (
            <section key={s.id} className={`wk-col wk-col-${s.id}`} aria-label={s.label}>
              <span className="wk-col-head" title={s.label}><Icon name={STATE_ICON[s.id]} size={18} /><b>{list.length}</b></span>
              {list.map((t) => {
                const c = colorOf(data, t.projectId)
                return (
                  <div key={t.id} className="wk-task" style={{ '--c': c }} role="button" tabIndex={0} onClick={() => advance(t)} onKeyDown={(e) => e.key === 'Enter' && advance(t)} title="Toca para pasarla al siguiente estado">
                    <span className="wk-task-title">{t.title}</span>
                    <span className="wk-task-meta">
                      <button className="wk-prio" style={{ background: PRIORITY[t.priority] }} onClick={(e) => { e.stopPropagation(); cyclePriority(t) }} aria-label={`Prioridad ${t.priority}`} title={`Prioridad ${t.priority}`} />
                      {mixed && <span className="wk-tag" style={{ background: soft(c, 30) }}>{t.projectName}</span>}
                      {t.due && <span className={`wk-due ${t.status !== 'done' && t.due < today ? 'is-late' : ''}`}>{formatShort(t.due).replace(/^\S+ /, '')}</span>}
                      <button className="wk-x" onClick={(e) => { e.stopPropagation(); remove(t) }} aria-label={`Borrar ${t.title}`}><Icon name="close" size={12} /></button>
                    </span>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
