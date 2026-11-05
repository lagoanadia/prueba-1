import { dayShort, todayISO, weekDays } from '../../lib/dates.js'
import { MEALS, OUT, dishName, dishesOf, mealsOf } from './food.js'

/**
 * Menú semanal. S: lo de hoy · T: hoy y los próximos días en lista · M: la semana (solo lectura)
 * L: la semana editable (elige plato o «Comer fuera») + añadir comidas opcionales (desayuno, merienda).
 */
export default function Menu({ size, data, update }) {
  const today = todayISO()
  const days = weekDays(today)
  const dishes = dishesOf(data)
  const meals = mealsOf(data)
  const menu = data.menu ?? {}

  const set = (day, meal, value) => update((d) => ({ ...d, menu: { ...d.menu, [day]: { ...d.menu?.[day], [meal]: value || null } } }))
  const toggleMeal = (m) => update((d) => {
    const cur = mealsOf(d)
    const next = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]
    return { ...d, meals: Object.keys(MEALS).filter((x) => next.includes(x)) } // siempre en orden del día
  })
  const cell = (day, meal) => dishName(dishes, menu[day]?.[meal]) || '—'

  if (size === 'S') {
    return (
      <div className="w-center menu-s">
        <span className="w-hint">Hoy</span>
        {meals.map((m) => <span key={m} className="w-ellipsis"><b>{MEALS[m]}:</b> {cell(today, m)}</span>)}
      </div>
    )
  }

  if (size === 'T') {
    return (
      <ul className="menu-list">
        {days.filter((d) => d >= today).map((d) => (
          <li key={d} className={d === today ? 'is-today' : ''}>
            <span className="week-day">{dayShort(d)} {Number(d.slice(8))}</span>
            {meals.map((m) => <span key={m} className="w-ellipsis menu-dish">{cell(d, m)}</span>)}
          </li>
        ))}
      </ul>
    )
  }

  // Una celda: en L se puede elegir plato; en M solo se lee
  const Cell = ({ d, m }) => {
    const v = menu[d]?.[m] ?? ''
    const cls = `menu-cell ${v === OUT ? 'is-out' : ''} ${d === today ? 'is-today' : ''}`
    return size === 'L' ? (
      <select className={cls} value={v} onChange={(e) => set(d, m, e.target.value)} aria-label={`${MEALS[m]} del ${dayShort(d)}`}>
        <option value="">—</option>
        {dishes.filter((x) => x.for.includes(m)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        <option value={OUT}>Comer fuera</option>
      </select>
    ) : <span className={cls} title={cell(d, m)}>{cell(d, m)}</span>
  }

  return (
    <>
      {/* Ancho: días en columnas. Estrecho (móvil): días en filas. Lo decide el CSS según el ancho del widget. */}
      <div className="menu-grid" style={{ '--rows': meals.length }}>
        <span />
        {days.map((d) => <span key={d} className={`menu-day ${d === today ? 'is-today' : ''}`}>{dayShort(d)} {Number(d.slice(8))}</span>)}
        {meals.map((m) => (
          <div key={m} className="menu-row">
            <span className="menu-meal">{MEALS[m]}</span>
            {days.map((d) => <Cell key={d} d={d} m={m} />)}
          </div>
        ))}
      </div>
      <div className="menu-rows" style={{ '--cols': meals.length }}>
        <span />
        {meals.map((m) => <span key={m} className="menu-meal">{MEALS[m]}</span>)}
        {days.map((d) => (
          <div key={d} className="menu-row">
            <span className={`menu-day ${d === today ? 'is-today' : ''}`}>{dayShort(d)} {Number(d.slice(8))}</span>
            {meals.map((m) => <Cell key={m} d={d} m={m} />)}
          </div>
        ))}
      </div>
      {size === 'L' && (
        <div className="chips chips-sm">
          {['desayuno', 'merienda'].map((m) => (
            <button key={m} className={`chip ${meals.includes(m) ? 'chip-on' : ''}`} onClick={() => toggleMeal(m)}>{meals.includes(m) ? '−' : '+'} {MEALS[m]}</button>
          ))}
        </div>
      )}
    </>
  )
}
