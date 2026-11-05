import { useState } from 'react'
import { addDays, daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { activeOf, progressOf, projectsOf } from './projects.js'

/**
 * Proyectos: progreso (tareas hechas / total) y fecha límite.
 * Tocar uno lo selecciona para el widget «Tablero».
 * S: resumen · M: los 2 primeros · T: lista · L: lista + nuevo proyecto.
 */
export default function Projects({ size, data, update }) {
  const today = todayISO()
  const projects = projectsOf(data)
  const active = activeOf(data)
  const [name, setName] = useState('')
  const [deadline, setDeadline] = useState(addDays(today, 30))

  const select = (id) => update((d) => ({ ...d, activeProject: id }))
  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, activeProject: id, projects: [...projectsOf(d), { id, name: name.trim(), deadline, tasks: [] }] }))
    setName('')
  }

  if (size === 'S') {
    const pending = projects.reduce((s, p) => s + p.tasks.filter((t) => t.status !== 'done').length, 0)
    return <div className="w-center"><b className="big">{projects.length}</b><span className="w-hint">proyectos · {pending} tareas</span></div>
  }

  return (
    <>
      <ul className="projects">
        {(size === 'M' ? projects.slice(0, 2) : projects).map((p) => {
          const { total, done, pct } = progressOf(p)
          const left = daysUntil(p.deadline, today)
          return (
            <li key={p.id}>
              <button className={`project ${active?.id === p.id ? 'is-active' : ''}`} onClick={() => select(p.id)}>
                <span className="goal-top"><span className="w-ellipsis">{p.name}</span><b>{pct} %</b></span>
                <span className="bar"><span style={{ width: `${pct}%` }} /></span>
                <span className="w-hint">{done} de {total} tareas · {left < 0 ? 'vencido' : left === 0 ? 'entrega hoy' : `${formatShort(p.deadline)} · faltan ${left} d`}</span>
              </button>
            </li>
          )
        })}
        {projects.length === 0 && <li className="w-hint">Sin proyectos</li>}
      </ul>
      {size === 'L' && (
        <form className="w-form" onSubmit={add}>
          <input placeholder="Nuevo proyecto" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ flex: 'none' }} />
          <button className="pill pill-soft" disabled={!name.trim()}>Crear</button>
        </form>
      )}
    </>
  )
}
