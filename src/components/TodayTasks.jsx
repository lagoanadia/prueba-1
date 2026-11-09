import { AREAS } from '../data/areas.js'

/**
 * Tarjeta «Tareas de hoy»: lo que toca hoy en todas las áreas, agrupado por área.
 * items: [{ key, area, title, time?, done, late?, toggle() }]
 */
export default function TodayTasks({ items, compact = false }) {
  const groups = AREAS.map((a) => ({ ...a, items: items.filter((e) => e.area === a.id) })).filter((g) => g.items.length)

  return (
    <section className={`card tasks ${compact ? 'tasks-compact' : ''}`} aria-labelledby="tareas-hoy">
      <h2 id="tareas-hoy">Tareas de hoy</h2>
      {groups.length === 0 && <p className="muted">No tienes nada pendiente para hoy.</p>}
      {groups.map((g) => (
        <div key={g.id} className="task-group">
          <span className="task-area"><span className="dot" style={{ background: g.color }} />{g.label}</span>
          <ul>
            {g.items.map((e, i) => (
              <li key={e.key} className={`task ${e.done ? 'task-done' : ''}`} style={{ '--i': i }}>
                <label>
                  <span className="task-title">
                    {e.time && <b>{e.time} </b>}{e.title}
                    {e.late && <span className="badge-late">Vencida</span>}
                  </span>
                  <input type="checkbox" checked={e.done} onChange={e.toggle}
                    aria-label={`Marcar «${e.title}» como ${e.done ? 'pendiente' : 'hecha'}`} />
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
