import { useState } from 'react'
import { activeDishOf, dishesOf } from './food.js'

/**
 * Receta del plato elegido en «Mis platos». S: nombre y tiempo · M: ingredientes
 * T: ingredientes + pasos · L: ingredientes + pasos, editable (añadir líneas).
 */
export default function Recipe({ size, data, update }) {
  const dish = activeDishOf(data)
  const [ing, setIng] = useState('')
  const [step, setStep] = useState('')
  if (!dish) return <p className="w-hint w-center">Sin platos</p>

  // Editar = guardar una copia de los platos con este cambiado (los de ejemplo pasan a ser tuyos)
  const change = (fn) => update((d) => ({ ...d, dishes: dishesOf(d).map((x) => (x.id === dish.id ? fn(x) : x)) }))
  const addLine = (key, value, reset) => (e) => {
    e.preventDefault()
    if (!value.trim()) return
    change((x) => ({ ...x, [key]: [...x[key], value.trim()] }))
    reset('')
  }
  const removeLine = (key, i) => change((x) => ({ ...x, [key]: x[key].filter((_, j) => j !== i) }))

  if (size === 'S') {
    return <div className="w-center"><b className="w-clamp recipe-name">{dish.name}</b>{dish.time && <span className="w-hint">{dish.time} min</span>}</div>
  }

  return (
    <>
      <div className="w-row"><b className="w-ellipsis recipe-name">{dish.name}</b>{dish.time && <span className="w-hint">{dish.time} min</span>}</div>
      <div className={`recipe recipe-${size}`}>
        <div>
          <span className="kb-head">Ingredientes</span>
          <ul className="ingredients">
            {dish.ingredients.map((x, i) => <li key={x + i}>{x}{size === 'L' && <button className="prio-x" onClick={() => removeLine('ingredients', i)} aria-label="Quitar">×</button>}</li>)}
          </ul>
          {size === 'L' && <form onSubmit={addLine('ingredients', ing, setIng)}><input className="line-input" placeholder="+ ingrediente" value={ing} onChange={(e) => setIng(e.target.value)} maxLength={40} /></form>}
        </div>
        {size !== 'M' && (
          <div>
            <span className="kb-head">Preparación</span>
            <ol className="steps">
              {dish.steps.map((x, i) => <li key={x + i}>{x}{size === 'L' && <button className="prio-x" onClick={() => removeLine('steps', i)} aria-label="Quitar">×</button>}</li>)}
            </ol>
            {size === 'L' && <form onSubmit={addLine('steps', step, setStep)}><input className="line-input" placeholder="+ paso" value={step} onChange={(e) => setStep(e.target.value)} maxLength={120} /></form>}
          </div>
        )}
      </div>
    </>
  )
}
