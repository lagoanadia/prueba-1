import { todayISO, weekDays, weekStart } from '../../lib/dates.js'
import { dishCounts, dishesOf } from './food.js'

/**
 * Batch cooking: qué cocinar de una vez para la semana. Cuenta cuántas raciones de cada plato
 * hay en el menú (de hoy en adelante). Marca cada plato cuando lo tengas hecho.
 */
export default function Batch({ size, data, update }) {
  const today = todayISO()
  const week = weekStart(today)
  const dishes = dishesOf(data)
  const counts = dishCounts(data, weekDays(today).filter((d) => d >= today))
  const done = data.batch?.week === week ? data.batch.done : {}
  const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n, name: dishes.find((d) => d.id === id)?.name ?? '' }))
  const portions = list.reduce((s, x) => s + x.n, 0)
  const toggle = (id) => update((d) => {
    const cur = d.batch?.week === week ? d.batch.done : {}
    return { ...d, batch: { week, done: { ...cur, [id]: !cur[id] } } }
  })

  if (size === 'S') {
    return <div className="w-center"><b className="big">{portions}</b><span className="w-hint">raciones · {list.filter((x) => done[x.id]).length}/{list.length} hechas</span></div>
  }

  return (
    <>
      <span className="w-hint">{portions} raciones para lo que queda de semana</span>
      <ul className="batch">
        {list.map((x) => (
          <li key={x.id} className={done[x.id] ? 'is-done' : ''}>
            <button className="prio-num" onClick={() => toggle(x.id)} aria-label={done[x.id] ? 'Marcar pendiente' : 'Marcar hecho'}>{done[x.id] ? '✓' : `×${x.n}`}</button>
            <span className="w-ellipsis prio-text">{x.name}</span>
          </li>
        ))}
        {list.length === 0 && <li className="w-hint">Nada planificado</li>}
      </ul>
    </>
  )
}
