import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { dishesOf } from '../../widgets/comida/food.js'
import Modal from './Modal.jsx'

/**
 * Lista de la compra. Soltar (o elegir) una receta pregunta qué ingredientes guardados quieres añadir.
 * Lo marcado se tacha y baja; «limpiar» quita lo ya comprado.
 */
export default function ShoppingCard({ data, update }) {
  const items = data.shop?.items ?? []
  const dishes = dishesOf(data)
  const [text, setText] = useState('')
  const [over, setOver] = useState(false)
  const [pick, setPick] = useState(null) // id de receta
  const [choose, setChoose] = useState(false)

  const save = (fn) => update((d) => ({ ...d, shop: { items: fn(d.shop?.items ?? []) } }))
  const add = (texts) => save((cur) => {
    const have = new Set(cur.map((i) => i.text.toLowerCase()))
    const fresh = [...new Set(texts.map((t) => t.trim()).filter(Boolean))].filter((t) => !have.has(t.toLowerCase()))
    return [...cur, ...fresh.map((t) => ({ id: crypto.randomUUID(), text: t, done: false }))]
  })
  const toggle = (id) => save((cur) => cur.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  const submit = (e) => { e.preventDefault(); if (text.trim()) { add([text]); setText('') } }
  const sorted = [...items.filter((i) => !i.done), ...items.filter((i) => i.done)]

  return (
    <section className={`card fd-card ${over ? 'is-over' : ''}`} aria-label="Lista de la compra"
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/dish'); if (dishes.some((x) => x.id === id)) setPick(id) }}>
      <div className="fd-title">
        <span className="fd-ic"><Icon name="cart" size={18} /></span><b>Lista de la compra</b><span className="fd-grow" />
        {items.some((i) => i.done) && <button className="fd-ib" onClick={() => save((c) => c.filter((i) => !i.done))} aria-label="Quitar lo comprado" title="Quitar lo comprado"><Icon name="trash" size={16} /></button>}
        <button className="fd-ib" onClick={() => setChoose(true)} aria-label="Añadir ingredientes de una receta" title="Añadir de una receta"><Icon name="book" size={16} /></button>
      </div>
      <ul className="fd-list">
        {sorted.map((i) => (
          <li key={i.id} className={i.done ? 'is-done' : ''}>
            <label><input type="checkbox" checked={i.done} onChange={() => toggle(i.id)} /><span className="fd-chk">{i.done && <Icon name="check" size={12} color="#fff" strokeWidth={3.6} />}</span><span>{i.text}</span></label>
            <button className="fd-del" onClick={() => save((c) => c.filter((x) => x.id !== i.id))} aria-label={`Quitar ${i.text}`}><Icon name="close" size={14} /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit}><input className="fd-input fd-sm" placeholder="Añadir a la lista" value={text} maxLength={40} onChange={(e) => setText(e.target.value)} aria-label="Añadir a la lista" /></form>
      {choose && (
        <Modal title="¿De qué receta?" icon="cart" onClose={() => setChoose(false)}>
          <div className="fd-chips">{dishes.map((x) => <button key={x.id} className="fd-chip" onClick={() => { setChoose(false); setPick(x.id) }}>{x.name}</button>)}{dishes.length === 0 && <p className="fd-hint">Aún no hay recetas guardadas</p>}</div>
        </Modal>
      )}
      {pick && <PickIngredients dish={dishes.find((x) => x.id === pick)} have={items} onAdd={(t) => { add(t); setPick(null) }} onClose={() => setPick(null)} />}
    </section>
  )
}

function PickIngredients({ dish, have, onAdd, onClose }) {
  const inList = new Set(have.map((i) => i.text.toLowerCase()))
  const [sel, setSel] = useState(() => dish.ingredients.filter((x) => !inList.has(x.toLowerCase())))
  const toggle = (x) => setSel((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]))
  return (
    <Modal title={dish.name} icon="bowl" onClose={onClose}>
      <p className="fd-hint">¿Qué ingredientes añades a la compra?</p>
      {dish.ingredients.length === 0 && <p className="fd-hint">Esta receta no tiene ingredientes guardados.</p>}
      <ul className="fd-list">
        {dish.ingredients.map((x) => {
          const already = inList.has(x.toLowerCase())
          return <li key={x} className={already ? 'is-done' : ''}><label><input type="checkbox" disabled={already} checked={already || sel.includes(x)} onChange={() => toggle(x)} /><span className="fd-chk">{(already || sel.includes(x)) && <Icon name="check" size={12} color="#fff" strokeWidth={3.6} />}</span><span>{x}{already ? ' · ya está' : ''}</span></label></li>
        })}
      </ul>
      <div className="fd-row"><span className="fd-hint">{sel.length} seleccionados</span><span className="fd-grow" /><button className="fd-ok" disabled={!sel.length} onClick={() => onAdd(sel)} aria-label="Añadir" title="Añadir"><Icon name="check" size={20} /></button></div>
    </Modal>
  )
}
