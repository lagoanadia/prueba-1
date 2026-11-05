import { useState } from 'react'
import { todayISO, weekDays, weekStart } from '../../lib/dates.js'
import { dishCounts, dishesOf } from './food.js'

/**
 * Lista de la compra de ESTA semana: sale sola de los ingredientes del menú + lo que añadas a mano.
 * Lo marcado se tacha y baja al final. Al cambiar de semana, la lista empieza de cero.
 */
export default function Shopping({ size, data, update }) {
  const today = todayISO()
  const week = weekStart(today)
  const dishes = dishesOf(data)
  const counts = dishCounts(data, weekDays(today))
  const state = data.shopping?.week === week ? data.shopping : { week, extra: [], checked: {} }
  const [text, setText] = useState('')

  // Ingredientes de los platos del menú, sin repetir (ignorando mayúsculas)
  const fromMenu = [...new Map(Object.keys(counts).flatMap((id) => dishes.find((d) => d.id === id)?.ingredients ?? []).map((x) => [x.toLowerCase(), x])).values()]
  const items = [...fromMenu.map((x) => ({ key: x.toLowerCase(), text: x })), ...state.extra.map((x) => ({ key: 'x:' + x.id, text: x.text, extra: true }))]
  const sorted = [...items.filter((i) => !state.checked[i.key]), ...items.filter((i) => state.checked[i.key])]
  const left = items.filter((i) => !state.checked[i.key]).length

  const save = (fn) => update((d) => ({ ...d, shopping: fn(d.shopping?.week === week ? d.shopping : { week, extra: [], checked: {} }) }))
  const toggle = (key) => save((s) => ({ ...s, checked: { ...s.checked, [key]: !s.checked[key] } }))
  const add = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    save((s) => ({ ...s, extra: [...s.extra, { id: crypto.randomUUID(), text: text.trim() }] }))
    setText('')
  }

  if (size === 'S') return <div className="w-center"><b className="big">{left}</b><span className="w-hint">por comprar</span></div>

  return (
    <>
      <ul className={`shopping ${size === 'L' ? 'shopping-cols' : ''}`}>
        {sorted.map((i) => (
          <li key={i.key} className={state.checked[i.key] ? 'is-done' : ''}>
            <label><input type="checkbox" checked={Boolean(state.checked[i.key])} onChange={() => toggle(i.key)} /><span className="w-ellipsis">{i.text}</span></label>
          </li>
        ))}
        {items.length === 0 && <li className="w-hint">Planifica el menú y aparecerá aquí</li>}
      </ul>
      <form className="w-form" onSubmit={add}><input placeholder="+ Añadir a la lista" value={text} onChange={(e) => setText(e.target.value)} maxLength={40} /></form>
    </>
  )
}
