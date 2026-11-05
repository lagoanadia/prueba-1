import { useState } from 'react'
import History from '../../components/History.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'
import { PRIORITIES, STATES, activeOf, updateTask } from './projects.js'

const NEXT = { todo: 'doing', doing: 'done' }

/**
 * Tablero del proyecto seleccionado: Pendientes → En proceso → Completadas.
 * Tocar una tarea la pasa al siguiente estado. Las completadas son "pasado": van al historial.
 * S: cuántas hay en cada estado · M y T: columnas compactas · L: columnas + añadir tarea.
 */
export default function Kanban({ size, data, update }) {
  const today = todayISO()
  const project = activeOf(data)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('media')
  const [due, setDue] = useState('')

  if (!project) return <p className="w-hint w-center">Crea un proyecto primero</p>

  const tasks = (s) => project.tasks.filter((t) => t.status === s).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))
  const advance = (t) => update((d) => updateTask(d, project.id, t.id, { status: NEXT[t.status], ...(NEXT[t.status] === 'done' ? { doneAt: today } : {}) }))
  const add = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const task = { id: crypto.randomUUID(), title: title.trim(), priority, due: due || null, status: 'todo' }
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === project.id ? { ...p, tasks: [...p.tasks, task] } : p)) }))
    setTitle('')
    setDue('')
  }
  const done = tasks('done')
  const history = <History title={`Completadas · ${project.name}`} empty="Aún no hay tareas completadas" items={done.slice().reverse().map((t) => ({ id: t.id, date: t.doneAt ? formatShort(t.doneAt) : '', text: t.title }))} />

  if (size === 'S') {
    return (
      <div className="w-center">
        <span className="w-hint w-ellipsis">{project.name}</span>
        <div className="kb-counts">{STATES.map((s) => <span key={s.id}><b>{tasks(s.id).length}</b>{s.label.slice(0, 4)}.</span>)}</div>
      </div>
    )
  }

  return (
    <>
      {history}
      <span className="w-hint w-ellipsis kb-project">{project.name}</span>
      <div className={`kanban ${size === 'T' ? 'kanban-v' : ''}`}>
        {STATES.slice(0, 2).map((s) => (
          <div key={s.id} className="kb-col">
            <span className="kb-head">{s.label} · {tasks(s.id).length}</span>
            <ul>
              {tasks(s.id).map((t) => (
                <li key={t.id}>
                  <button className="kb-task" onClick={() => advance(t)} title="Toca para pasarla al siguiente estado">
                    <span className="dot" style={{ background: PRIORITIES[t.priority] }} />
                    <span className="w-ellipsis">{t.title}</span>
                    {t.due && size === 'L' && <span className="w-hint kb-due">{formatShort(t.due)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="kb-col kb-done">
          <span className="kb-head">Completadas · {done.length}</span>
        </div>
      </div>
      {size === 'L' && (
        <form className="w-form" onSubmit={add}>
          <input placeholder="Nueva tarea" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ flex: 'none', '--c': PRIORITIES[priority] }}>
            <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ flex: 'none' }} aria-label="Fecha" />
          <button className="mini mini-primary" aria-label="Añadir tarea" disabled={!title.trim()}>+</button>
        </form>
      )}
    </>
  )
}
