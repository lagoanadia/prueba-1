import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { MEALS, activeDishOf, dishesOf } from '../../widgets/comida/food.js'
import DishForm from './DishForm.jsx'
import Modal from './Modal.jsx'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const letterOf = (name) => (name ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase()

/** Recetario por niveles: abecedario (la letra bajo el ratón crece en ola) → cajitas de recetas → receta abierta. */
export default function Cookbook({ data, update }) {
  const dishes = dishesOf(data)
  const active = activeDishOf(data)
  const [letter, setLetter] = useState(null)
  const [hot, setHot] = useState(null) // índice de la letra bajo el ratón (para la onda)
  const [editing, setEditing] = useState(false)

  const has = new Set(dishes.map((d) => letterOf(d.name)))
  const shown = letter ?? (active ? letterOf(active.name) : LETTERS.find((l) => has.has(l)))
  const list = dishes.filter((d) => letterOf(d.name) === shown).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const select = (id) => update((d) => ({ ...d, activeDish: id }))
  const save = (patch) => { update((d) => ({ ...d, dishes: dishesOf(d).map((x) => (x.id === active.id ? { ...x, ...patch } : x)) })); setEditing(false) }
  const remove = () => {
    if (!window.confirm(`¿Eliminar «${active.name}»? También saldrá del menú.`)) return
    update((d) => {
      const menu = Object.fromEntries(Object.entries(d.menu ?? {}).map(([day, m]) => [day, Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v === active.id ? null : v]))]))
      return { ...d, dishes: dishesOf(d).filter((x) => x.id !== active.id), menu, activeDish: null, batchPlan: (d.batchPlan ?? []).filter((b) => b.dish !== active.id) }
    })
    setEditing(false)
  }

  return (
    <section className="card fd-card fd-cookbook" aria-label="Recetario">
      <div className="fd-title"><span className="fd-ic"><Icon name="book" size={18} /></span><b>Recetario</b></div>
      <div className="fd-abc" role="tablist" aria-label="Letras" onMouseLeave={() => setHot(null)}>
        {LETTERS.map((l, i) => {
          const d = hot == null ? 9 : Math.abs(i - hot)
          const sel = hot == null ? l === shown : d === 0
          return (
            <button key={l} role="tab" aria-selected={l === shown} className={`fd-l ${has.has(l) ? 'has' : ''} ${hot == null && l === shown ? 'is-sel' : ''} d${Math.min(d, 3)}`}
              onMouseEnter={() => { setHot(i); setLetter(l) }} onFocus={() => setLetter(l)} onClick={() => setLetter(l)} data-sel={sel}>{l}</button>
          )
        })}
      </div>

      {dishes.length === 0 && <p className="fd-empty">Guarda tu primera comida y aparecerá aquí.</p>}
      {dishes.length > 0 && list.length === 0 && <p className="fd-empty">Sin recetas con la {shown}</p>}
      <div className="fd-cards">
        {list.map((x) => (
          <button key={x.id} draggable className={`fd-rec ${active?.id === x.id ? 'is-sel' : ''}`} onClick={() => select(x.id)}
            onDragStart={(e) => { e.dataTransfer.setData('text/dish', x.id); e.dataTransfer.effectAllowed = 'copy' }}>
            <span className="fd-rec-name"><Icon name="grip" size={14} color="#9AA0A6" strokeWidth={3} />{x.name}</span>
            <span className="fd-tags">{x.for.map((m) => <span key={m} className="fd-tag">{MEALS[m]}</span>)}</span>
          </button>
        ))}
      </div>

      {active && list.length > 0 && (
        <div className="fd-detail">
          <div className="fd-detail-head">
            <h2>{active.name}</h2>
            <button className="fd-ib" onClick={() => setEditing(true)} aria-label="Editar receta" title="Editar receta"><Icon name="pen" size={16} /></button>
          </div>
          <div className="fd-tags">
            {active.for.map((m) => <span key={m} className="fd-chip is-on">{MEALS[m]}</span>)}
            {active.time && <span className="fd-chip"><Icon name="clock" size={13} />{active.time} min</span>}
          </div>
          <hr />
          <div className="fd-cols">
            <div><b>Ingredientes</b>{active.ingredients.length ? <ul>{active.ingredients.map((x, i) => <li key={x + i}>{x}</li>)}</ul> : <p className="fd-hint">Sin ingredientes</p>}</div>
            <div><b>Preparación</b>{active.steps.length ? <ol>{active.steps.map((x, i) => <li key={x + i}>{x}</li>)}</ol> : <p className="fd-hint">Sin pasos</p>}</div>
          </div>
        </div>
      )}
      {editing && active && (
        <Modal title="Editar receta" icon="pen" onClose={() => setEditing(false)} wide>
          <DishForm initial={active} onSave={save} onRemove={remove} />
        </Modal>
      )}
    </section>
  )
}
