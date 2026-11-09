import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { formatLong, formatShort, todayISO } from '../lib/dates.js'
import { STATES, activeOf, progressOf, projectsOf, updateTask } from '../widgets/trabajo/projects.js'

const PRIORITY = { alta: { label: 'Alta', color: '#E84855' }, media: { label: 'Media', color: '#F9DC5C' }, baja: { label: 'Baja', color: '#3DDC97' } }
const NEXT_PRIORITY = { baja: 'media', media: 'alta', alta: 'baja' }
const NEXT_STATE = { todo: 'doing', doing: 'done', done: 'todo' }

/**
 * Página de Trabajo (diseño oficial): proyectos en tarjetas + tablero del proyecto elegido.
 * Pulsar una tarea la pasa al siguiente estado; pulsar su prioridad la cambia.
 */
export default function WorkPage({ data, update }) {
  const today = todayISO()
  const projects = projectsOf(data)
  const project = activeOf(data)
  const [name, setName] = useState('')
  const [task, setTask] = useState('')
  const [due, setDue] = useState('')

  const addProject = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, activeProject: id, projects: [...projectsOf(d), { id, name: name.trim(), deadline: null, tasks: [] }] }))
    setName('')
  }
  const addTask = (e) => {
    e.preventDefault()
    if (!task.trim() || !project) return
    const t = { id: crypto.randomUUID(), title: task.trim(), priority: 'media', due: due || null, status: 'todo' }
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === project.id ? { ...p, tasks: [...p.tasks, t] } : p)) }))
    setTask('')
    setDue('')
  }
  const advance = (t) => update((d) => updateTask(d, project.id, t.id, { status: NEXT_STATE[t.status], doneAt: NEXT_STATE[t.status] === 'done' ? today : null }))
  const cyclePriority = (t) => update((d) => updateTask(d, project.id, t.id, { priority: NEXT_PRIORITY[t.priority] }))
  const setDeadline = (id, deadline) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, deadline } : p)) }))

  return (
    <div className="page work">
      <header className="page-head">
        <h1 className="sr-only">Trabajo</h1>
        <form className="page-actions" onSubmit={addProject}>
          <input className="pill-input" placeholder="Nombre del proyecto" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          <button className="icon-btn on" disabled={!name.trim()} aria-label="Nuevo proyecto" title="Nuevo proyecto"><Icon name="plus" size={22} /></button>
        </form>
      </header>

      <h2 className="sr-only">Proyectos</h2>
      {projects.length === 0 && <p className="muted">Crea tu primer proyecto arriba.</p>}
      <div className="project-cards">
        {projects.map((p, i) => {
          const { total, done, pct } = progressOf(p)
          return (
            <button key={p.id} className={`card project-card ${project?.id === p.id ? 'is-active' : ''}`} style={{ '--i': i }}
              onClick={() => update((d) => ({ ...d, activeProject: p.id }))}>
              <b className="project-card-name">{p.name}</b>
              <label className="muted project-deadline" onClick={(e) => e.stopPropagation()}>
                Fecha límite: {p.deadline ? formatLong(p.deadline).replace(/ de \d{4}$/, '') : '—'}
                <input type="date" value={p.deadline ?? ''} onChange={(e) => setDeadline(p.id, e.target.value || null)} aria-label="Cambiar fecha límite" />
              </label>
              <span className="w-row"><span>{done} de {total} tareas</span><b className="project-pct">{pct} %</b></span>
              <span className="bar bar-red"><span style={{ width: `${pct}%` }} /></span>
            </button>
          )
        })}
      </div>

      {project && (
        <>
          <div className="page-head page-head-sm">
            <h2 className="page-h2">{project.name}</h2>
            <form className="page-actions" onSubmit={addTask}>
              <input className="pill-input" placeholder="Nueva tarea" value={task} onChange={(e) => setTask(e.target.value)} maxLength={60} />
              <input className="pill-input pill-date" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fecha" />
              <button className="pill pill-red" disabled={!task.trim()}>Añadir tarea</button>
            </form>
          </div>
          <p className="muted page-hint">Pulsa una tarea para pasarla al siguiente estado.</p>
          <div className="kanban-page">
            {STATES.map((s) => {
              const tasks = project.tasks.filter((t) => t.status === s.id)
              return (
                <section key={s.id} className={`kcol kcol-${s.id}`}>
                  <h3>{s.label} · {tasks.length}</h3>
                  {tasks.map((t) => (
                    <div key={t.id} className="ktask" role="button" tabIndex={0} onClick={() => advance(t)} onKeyDown={(e) => e.key === 'Enter' && advance(t)}>
                      <b className="ktask-title">{t.title}</b>
                      <span className="w-row">
                        <button className="prio-badge" style={{ '--c': PRIORITY[t.priority].color }} onClick={(e) => { e.stopPropagation(); cyclePriority(t) }} title="Cambiar prioridad">{PRIORITY[t.priority].label}</button>
                        {t.due && <span className={`muted ktask-due ${t.status !== 'done' && t.due < today ? 'is-late' : ''}`}>{formatShort(t.due).replace(/^\S+ /, '')}</span>}
                      </span>
                    </div>
                  ))}
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
