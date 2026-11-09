import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { formatShort, daysUntil } from '../../lib/dates.js'
import { progressOf, projectsOf } from '../../widgets/trabajo/projects.js'
import { PROJECT_COLORS, colorOf, soft } from './shared.js'

/** Proyectos: cada uno con su color, plazo y progreso. Tocar uno lo abre por dentro. */
export default function ProjectsBlock({ data, update, openProject }) {
  const projects = projectsOf(data)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, projects: [...projectsOf(d), { id, name: name.trim(), createdAt: new Date().toLocaleDateString('en-CA'), color: PROJECT_COLORS[projectsOf(d).length % PROJECT_COLORS.length], deadline: null, tasks: [] }] }))
    setName('')
    setAdding(false)
  }
  const setDeadline = (id, deadline) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, deadline } : p)) }))
  const remove = (p) => { if (window.confirm(`¿Borrar «${p.name}» y sus ${p.tasks.length} tareas?`)) update((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== p.id), selectedProjects: (d.selectedProjects ?? []).filter((x) => x !== p.id) })) }

  return (
    <div className="wk-projects">
      <div className="wk-chips">
        {projects.map((p, i) => {
          const c = colorOf(data, p.id)
          const { total, done, pct } = progressOf(p)
          const left = p.deadline ? daysUntil(p.deadline) : null
          return (
            <div key={p.id} className="wk-project on" style={{ '--c': c, '--i': i }}>
              <button className="wk-project-main" onClick={() => openProject(p.id)} title="Abrir proyecto">
                <span className="dot" style={{ background: c }} />
                <b>{p.name}</b>
                <span className="wk-pct">{pct}%</span>
                <span className="bar"><span style={{ width: `${pct}%`, background: c }} /></span>
                <span className="muted wk-meta"><Icon name="check" size={14} />{done}/{total}</span>
              </button>
              <label className={`wk-deadline ${left != null && left < 0 && pct < 100 ? 'is-late' : ''}`} title="Fecha límite" style={{ background: soft(c, 25) }}>
                <Icon name="calendario" size={14} />{p.deadline ? formatShort(p.deadline).replace(/^\S+ /, '') : '—'}
                <input type="date" value={p.deadline ?? ''} onChange={(e) => setDeadline(p.id, e.target.value || null)} aria-label={`Fecha límite de ${p.name}`} />
              </label>
              <button className="wk-x" onClick={() => remove(p)} aria-label={`Borrar ${p.name}`}><Icon name="close" size={12} /></button>
            </div>
          )
        })}
        {adding ? (
          <form className="wk-add" onSubmit={add}>
            <input autoFocus placeholder="Proyecto" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !name && setAdding(false)} maxLength={40} aria-label="Nombre del proyecto" />
            <button className="icon-btn on" disabled={!name.trim()} aria-label="Crear proyecto"><Icon name="check" size={18} /></button>
          </form>
        ) : (
          <button className="icon-btn wk-plus" onClick={() => setAdding(true)} aria-label="Nuevo proyecto" title="Nuevo proyecto"><Icon name="plus" size={20} /></button>
        )}
      </div>
    </div>
  )
}
