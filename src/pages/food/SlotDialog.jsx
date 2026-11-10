import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { dayShort } from '../../lib/dates.js'
import { MEALS, OUT, WITH, dishesOf, isWith } from '../../widgets/comida/food.js'
import { IngredientsEditor, StepsEditor } from './Editors.jsx'
import Modal from './Modal.jsx'

/**
 * Una casilla del menú: elige una receta guardada, «Comer fuera», «Con alguien» o escribe una nueva
 * (con sus ingredientes y pasos si quieres): la nueva se guarda también en el recetario.
 */
export default function SlotDialog({ day, meal, data, update, value, onSet, onClose }) {
  const dishes = dishesOf(data)
  const [q, setQ] = useState('')
  const [who, setWho] = useState(isWith(value) ? value.slice(WITH.length) : null) // null = sin «Con alguien»
  const [open, setOpen] = useState({ ing: false, steps: false })
  const [ings, setIngs] = useState([])
  const [steps, setSteps] = useState([])
  const text = q.trim()
  const norm = (s) => s.toLowerCase()
  const list = dishes.filter((x) => !text || norm(x.name).includes(norm(text))).sort((a, b) => Number(b.for.includes(meal)) - Number(a.for.includes(meal)))
  const exact = dishes.find((x) => norm(x.name) === norm(text))
  const isNew = text && !exact

  const finish = (v) => { onSet(v); onClose() }
  const confirm = (e) => {
    e.preventDefault()
    if (who !== null && !text) { if (who.trim()) finish(WITH + who.trim()); return }
    if (exact) return finish(exact.id)
    if (!isNew) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, dishes: [...dishesOf(d), { id, name: text, for: [meal], time: null, ingredients: ings, steps: steps.map((s) => s.trim()).filter(Boolean) }], menu: { ...d.menu, [day]: { ...d.menu?.[day], [meal]: id } } }))
    onClose()
  }

  return (
    <Modal title={`${MEALS[meal]} · ${dayShort(day)} ${Number(day.slice(8))}`} icon="comida" onClose={onClose}>
      <form className="fd-form" onSubmit={confirm}>
        <div className="fd-row">
          <input className="fd-input" autoFocus placeholder="Buscar o escribir receta…" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} aria-label="Receta" />
          <button className="fd-ok" disabled={!(isNew || exact || (who !== null && who.trim() && !text))} aria-label="Aceptar" title="Aceptar"><Icon name="check" size={20} /></button>
        </div>
        <div className="fd-chips">
          {list.slice(0, 14).map((x) => <button type="button" key={x.id} className={`fd-chip ${value === x.id ? 'is-on' : ''}`} onClick={() => finish(x.id)}>{x.name}</button>)}
          <button type="button" className={`fd-chip k-out ${value === OUT ? 'is-on' : ''}`} onClick={() => finish(OUT)}>Comer fuera</button>
          <button type="button" className={`fd-chip k-with ${who !== null ? 'is-on' : ''}`} onClick={() => setWho(who === null ? '' : null)}>Con alguien</button>
        </div>
        {who !== null && <input className="fd-input" autoFocus placeholder="¿Con quién?" value={who} maxLength={30} onChange={(e) => setWho(e.target.value)} aria-label="Con quién" />}
        {isNew && (
          <>
            <div className="fd-row">
              <button type="button" className={`fd-circle ${open.ing ? 'is-on' : ''}`} onClick={() => setOpen((o) => ({ ...o, ing: !o.ing }))} aria-label="Ingredientes" title="Ingredientes"><Icon name="bowl" size={22} /></button>
              <button type="button" className={`fd-circle ${open.steps ? 'is-on' : ''}`} onClick={() => setOpen((o) => ({ ...o, steps: !o.steps }))} aria-label="Pasos" title="Pasos"><Icon name="steps" size={22} /></button>
              <span className="fd-hint">Se guarda también en el recetario</span>
            </div>
            {open.ing && <div className="fd-panel"><IngredientsEditor dish={text} items={ings} onChange={setIngs} /></div>}
            {open.steps && <div className="fd-panel"><StepsEditor steps={steps} onChange={setSteps} /></div>}
          </>
        )}
        {value && <button type="button" className="fd-remove" onClick={() => finish(null)}><Icon name="trash" size={16} />Vaciar casilla</button>}
      </form>
    </Modal>
  )
}
