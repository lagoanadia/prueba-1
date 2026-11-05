import { useState } from 'react'
import { MEALS, activeDishOf, dishesOf } from './food.js'

/** Mis platos: tu recetario. Tocar un plato lo abre en el widget «Receta». L: + añadir plato. */
export default function Dishes({ size, data, update }) {
  const dishes = dishesOf(data)
  const active = activeDishOf(data)
  const [name, setName] = useState('')
  const [forMeals, setForMeals] = useState(['comida'])

  const select = (id) => update((d) => ({ ...d, activeDish: id }))
  const add = (e) => {
    e.preventDefault()
    if (!name.trim() || forMeals.length === 0) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, activeDish: id, dishes: [...dishesOf(d), { id, name: name.trim(), for: forMeals, time: null, ingredients: [], steps: [] }] }))
    setName('')
  }
  const toggleFor = (m) => setForMeals((f) => (f.includes(m) ? f.filter((x) => x !== m) : [...f, m]))

  if (size === 'S') return <div className="w-center"><b className="big">{dishes.length}</b><span className="w-hint">platos</span></div>

  return (
    <>
      <ul className="dishes">
        {(size === 'M' ? dishes.slice(0, 3) : dishes).map((x) => (
          <li key={x.id}>
            <button className={`dish ${active?.id === x.id ? 'is-active' : ''}`} onClick={() => select(x.id)}>
              <span className="w-ellipsis">{x.name}</span>
              <span className="w-hint dish-for">{x.for.map((m) => MEALS[m]).join(' · ')}</span>
            </button>
          </li>
        ))}
      </ul>
      {size === 'L' && (
        <form className="w-form w-form-col" onSubmit={add}>
          <div className="w-form">
            <input placeholder="Nombre del plato" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            <button className="pill pill-soft" disabled={!name.trim() || !forMeals.length}>Guardar</button>
          </div>
          <div className="chips chips-sm">
            {Object.entries(MEALS).map(([id, label]) => <button type="button" key={id} className={`chip ${forMeals.includes(id) ? 'chip-on' : ''}`} onClick={() => toggleFor(id)}>{label}</button>)}
          </div>
        </form>
      )}
    </>
  )
}
