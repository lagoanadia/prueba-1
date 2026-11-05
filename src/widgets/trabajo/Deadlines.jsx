import { daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { PRIORITIES, projectsOf } from './projects.js'

/** Próximas entregas: fechas de proyectos y de tareas pendientes, de la más cercana a la más lejana. */
export default function Deadlines({ size, data }) {
  const today = todayISO()
  const items = projectsOf(data).flatMap((p) => [
    { id: p.id, title: p.name, date: p.deadline, kind: 'proyecto', color: '#202124' },
    ...p.tasks.filter((t) => t.due && t.status !== 'done').map((t) => ({ id: t.id, title: t.title, date: t.due, kind: p.name, color: PRIORITIES[t.priority] })),
  ]).filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date))

  const label = (d) => { const n = daysUntil(d, today); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : `${n} d` }

  if (size === 'S') {
    const next = items[0]
    return next
      ? <div className="w-center"><b className="big">{label(next.date)}</b><span className="w-hint w-ellipsis">{next.title}</span></div>
      : <p className="w-hint w-center">Nada a la vista</p>
  }

  return (
    <ul className="deadlines">
      {items.slice(0, size === 'M' ? 3 : 8).map((x) => (
        <li key={x.id}>
          <span className="dot" style={{ background: x.color }} />
          <span className="dl-text"><span className="w-ellipsis">{x.title}</span><span className="w-hint w-ellipsis">{x.kind}</span></span>
          <span className="dl-when"><b>{label(x.date)}</b><span className="w-hint">{formatShort(x.date)}</span></span>
        </li>
      ))}
      {items.length === 0 && <li className="w-hint">Nada a la vista</li>}
    </ul>
  )
}
