import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { AREAS } from '../data/areas.js'

/**
 * Tarjeta «Tareas de hoy»: lo pendiente de hoy en todas las áreas, agrupado por área.
 * Al tachar una tarea desaparece de la lista; el icono de la derecha abre las tachadas para recuperarlas.
 * items: [{ key, area, title, time?, done, late?, toggle() }]
 */
export default function TodayTasks({ items, compact = false }) {
  const [open, setOpen] = useState(false)
  const pending = items.filter((e) => !e.done)
  const done = items.filter((e) => e.done)
  const groups = AREAS.map((a) => ({ ...a, items: pending.filter((e) => e.area === a.id) })).filter((g) => g.items.length)
  const color = (area) => AREAS.find((a) => a.id === area)?.color ?? '#9AA0A6'

  return (
    <section className={`card tasks ${compact ? 'tasks-compact' : ''}`} aria-labelledby="tareas-hoy">
      <div className="tasks-head">
        <h2 id="tareas-hoy">Tareas de hoy</h2>
        <button className="icon-btn tasks-restore" onClick={() => setOpen(true)} aria-label={`Recuperar tareas tachadas (${done.length})`} title="Recuperar tareas tachadas" disabled={done.length === 0}>
          <Icon name="restore" size={22} />
          {done.length > 0 && <span className="w-history-n">{done.length}</span>}
        </button>
      </div>
      {groups.length === 0 && <p className="muted">{done.length ? 'Todo hecho por hoy.' : 'No tienes nada pendiente para hoy.'}</p>}
      {groups.map((g) => (
        <div key={g.id} className="task-group">
          <span className="task-area"><span className="dot" style={{ background: g.color }} />{g.label}</span>
          <ul>
            {g.items.map((e, i) => (
              <li key={e.key} className="task" style={{ '--i': i }}>
                <label>
                  <span className="task-title">
                    {e.time && <b>{e.time} </b>}{e.title}
                    {e.late && <span className="badge-late">Vencida</span>}
                  </span>
                  <input type="checkbox" checked={false} onChange={e.toggle} aria-label={`Marcar «${e.title}» como hecha`} />
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {open && done.length > 0 && createPortal(
        <div className="popup" role="dialog" aria-modal="true" aria-label="Tareas tachadas">
          <div className="popup-backdrop" onClick={() => setOpen(false)} />
          <div className="popup-panel">
            <header className="area-head">
              <h2><Icon name="restore" size={20} /></h2>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar"><Icon name="close" /></button>
            </header>
                        <ul className="popup-list">
              {done.map((e) => (
                <li key={e.key} className="restore-row">
                  <span className="dot" style={{ background: color(e.area) }} />
                  <span className="w-text restore-title">{e.time && <b>{e.time} </b>}{e.title}</span>
                  <button className="icon-btn" onClick={e.toggle} aria-label={`Recuperar «${e.title}»`} title="Recuperar"><Icon name="restore" size={20} /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
