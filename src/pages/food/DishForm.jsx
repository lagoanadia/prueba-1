import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { MEALS } from '../../widgets/comida/food.js'
import { IngredientsEditor, StepsEditor } from './Editors.jsx'

/**
 * Formulario de un plato (guardar nuevo o editar). Nombre, tipo de comida (una sola línea) y debajo
 * dos iconos que despliegan ingredientes y pasos antes de guardar. Solo guarda al pulsar ✓.
 */
export default function DishForm({ initial, defaultFor = ['comida'], onSave, onRemove, autoFocus, children }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [forMeals, setForMeals] = useState(initial?.for ?? defaultFor)
  const [ings, setIngs] = useState(initial?.ingredients ?? [])
  const [steps, setSteps] = useState(initial?.steps ?? [])
  const [open, setOpen] = useState({ ing: Boolean(initial?.ingredients?.length), steps: Boolean(initial?.steps?.length) })
  const toggleFor = (m) => setForMeals((f) => (f.includes(m) ? f.filter((x) => x !== m) : [...f, m]))
  const ok = name.trim() && forMeals.length > 0

  const submit = (e) => {
    e.preventDefault()
    if (!ok) return
    onSave({ name: name.trim(), for: Object.keys(MEALS).filter((m) => forMeals.includes(m)), ingredients: ings, steps: steps.map((s) => s.trim()).filter(Boolean) })
    if (!initial) { setName(''); setIngs([]); setSteps([]); setOpen({ ing: false, steps: false }) }
  }

  return (
    <form className="fd-form" onSubmit={submit}>
      <div className="fd-row">
        <input className="fd-input" autoFocus={autoFocus} placeholder="Añadir comida" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Nombre de la comida" />
        <button className="fd-ok" disabled={!ok} aria-label="Guardar" title="Guardar"><Icon name="check" size={20} /></button>
      </div>
      <div className="fd-meals">
        {Object.entries(MEALS).map(([id, label]) => <button type="button" key={id} className={`fd-chip ${forMeals.includes(id) ? 'is-on' : ''}`} onClick={() => toggleFor(id)} aria-pressed={forMeals.includes(id)}>{label}</button>)}
      </div>
      <div className="fd-row">
        <button type="button" className={`fd-circle ${open.ing ? 'is-on' : ''}`} onClick={() => setOpen((o) => ({ ...o, ing: !o.ing }))} aria-label="Ingredientes" aria-expanded={open.ing} title="Ingredientes"><Icon name="bowl" size={22} /></button>
        <button type="button" className={`fd-circle ${open.steps ? 'is-on' : ''}`} onClick={() => setOpen((o) => ({ ...o, steps: !o.steps }))} aria-label="Pasos" aria-expanded={open.steps} title="Pasos"><Icon name="steps" size={22} /></button>
        {children}
        {onRemove && <button type="button" className="fd-circle fd-danger" onClick={onRemove} aria-label="Eliminar receta" title="Eliminar receta"><Icon name="trash" size={20} /></button>}
      </div>
      {open.ing && <div className="fd-panel"><IngredientsEditor dish={name} items={ings} onChange={setIngs} /></div>}
      {open.steps && <div className="fd-panel"><StepsEditor steps={steps} onChange={setSteps} /></div>}
    </form>
  )
}
