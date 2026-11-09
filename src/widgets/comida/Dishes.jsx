import AddPopup from '../AddPopup.jsx'
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

  const form = (close) => (
    <form className="w-form w-form-col" onSubmit={(e) => { add(e); if (name.trim() && forMeals.length) close?.() }}>
      <div className="w-form">
        <input autoFocus={Boolean(close)} placeholder="Nombre del plato" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        <button className="pill pill-soft" disabled={!name.trim() || !forMeals.length}>Guardar</button>
      </div>
      <div className="chips chips-sm">
        {Object.entries(MEALS).map(([id, label]) => <button type="button" key={id} className={`chip ${forMeals.includes(id) ? 'chip-on' : ''}`} onClick={() => toggleFor(id)}>{label}</button>)}
      </div>
    </form>
  )

  if (size === 'S') return <div className="w-center"><b className="big">{dishes.length}</b><span className="w-hint">platos</span></div>

  return (
    <>
      <ul className="dishes">
        {dishes.map((x) => (
          <li key={x.id}>
            <button className={`dish ${active?.id === x.id ? 'is-active' : ''}`} onClick={() => select(x.id)}>
              <span className="w-ellipsis">{x.name}</span>
              <span className="w-hint dish-for">{x.for.map((m) => MEALS[m]).join(' · ')}</span>
            </button>
          </li>
        ))}
      </ul>
      {size === 'L' ? form() : <AddPopup label="Nuevo plato">{form}</AddPopup>}
    </>
  )
}
