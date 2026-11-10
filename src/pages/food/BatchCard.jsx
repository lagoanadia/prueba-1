import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { addDays, dayShort, todayISO, weekDays, weekStart } from '../../lib/dates.js'
import { dishesOf } from '../../widgets/comida/food.js'
import Modal from './Modal.jsx'

const LET = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Batch cooking: planifica qué día cocinas cada plato y para qué días es.
 * Soltar una receta (o el botón +) abre el cuadro para elegir día de cocinado, días de consumo y raciones.
 */
export default function BatchCard({ data, update }) {
  const today = todayISO()
  const monday = weekStart(today)
  const dishes = dishesOf(data)
  const plan = (data.batchPlan ?? []).filter((b) => b.cook >= monday) // lo anterior ya es pasado
  const [dlg, setDlg] = useState(null) // { dish } | { dish: null } para elegir receta
  const [over, setOver] = useState(false)
  const save = (fn) => update((d) => ({ ...d, batchPlan: fn(d.batchPlan ?? []) }))
  const name = (id) => dishes.find((x) => x.id === id)?.name ?? ''
  const fmt = (iso) => `${dayShort(iso)} ${Number(iso.slice(8))}`

  return (
    <section className={`card fd-card ${over ? 'is-over' : ''}`} aria-label="Batch cooking"
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/dish'); if (dishes.some((x) => x.id === id)) setDlg({ dish: id }) }}>
      <div className="fd-title"><span className="fd-ic"><Icon name="pot" size={18} /></span><b>Batch cooking</b><span className="fd-grow" />
        <button className="fd-ib" onClick={() => setDlg({ dish: null })} aria-label="Planificar una cocinada" title="Planificar"><Icon name="plus" size={16} /></button></div>
      <ul className="fd-batch">
        {[...plan].sort((a, b) => a.cook.localeCompare(b.cook)).map((b) => (
          <li key={b.id} className={b.done ? 'is-done' : ''}>
            <button className="fd-chk-btn" onClick={() => save((c) => c.map((x) => (x.id === b.id ? { ...x, done: !x.done } : x)))} aria-label={b.done ? 'Marcar pendiente' : 'Marcar cocinado'}>{b.done ? <Icon name="check" size={14} color="#fff" strokeWidth={3.4} /> : <Icon name="pot" size={15} color="#B3261E" />}</button>
            <div className="fd-batch-main">
              <span className="fd-batch-top"><b>{name(b.dish)}</b><b>×{b.portions}</b></span>
              <span className="fd-hint">Cocinar el {fmt(b.cook)}{b.eat.length ? ` · ${b.eat.map((d) => dayShort(d)).join(', ')}` : ''}</span>
            </div>
            <button className="fd-del" onClick={() => save((c) => c.filter((x) => x.id !== b.id))} aria-label="Quitar"><Icon name="close" size={14} /></button>
          </li>
        ))}
        {plan.length === 0 && <li className="fd-hint">Planifica qué día cocinas cada plato</li>}
      </ul>
      {dlg && <BatchDialog dishes={dishes} initialDish={dlg.dish} week={weekDays(today)} onSave={(item) => { save((c) => [...c, { id: crypto.randomUUID(), done: false, ...item }]); setDlg(null) }} onClose={() => setDlg(null)} today={today} />}
    </section>
  )
}

function BatchDialog({ dishes, initialDish, week, onSave, onClose, today }) {
  const [dish, setDish] = useState(initialDish)
  const [cook, setCook] = useState(week.find((d) => d >= today) ?? week[0])
  const [eat, setEat] = useState([])
  const [portions, setPortions] = useState(null)
  const n = portions ?? Math.max(eat.length, 1)
  const toggle = (d) => setEat((e) => (e.includes(d) ? e.filter((x) => x !== d) : [...e, d].sort()))
  const nextWeek = week.map((d) => addDays(d, 7))
  const picker = (sel, on, multi) => (
    <div className="fd-chips">{[...week, ...(multi ? nextWeek : [])].map((d, i) => (
      <button type="button" key={d} className={`fd-chip fd-day-chip ${sel(d) ? 'is-on' : ''}`} onClick={() => on(d)} title={`${dayShort(d)} ${Number(d.slice(8))}`}>{LET[i % 7]}<small>{Number(d.slice(8))}</small></button>
    ))}</div>
  )
  return (
    <Modal title="Batch cooking" icon="pot" onClose={onClose}>
      {!dish ? (
        <div className="fd-chips">{dishes.map((x) => <button key={x.id} className="fd-chip" onClick={() => setDish(x.id)}>{x.name}</button>)}{dishes.length === 0 && <p className="fd-hint">Aún no hay recetas guardadas</p>}</div>
      ) : (
        <div className="fd-form">
          <b>{dishes.find((x) => x.id === dish)?.name}</b>
          <span className="fd-hint">Cocinar el</span>{picker((d) => d === cook, setCook, false)}
          <span className="fd-hint">Para comer</span>{picker((d) => eat.includes(d), toggle, true)}
          <div className="fd-row">
            <button type="button" className="fd-ib" onClick={() => setPortions(Math.max(1, n - 1))} aria-label="Menos raciones">−</button>
            <span className="fd-hint">×{n} raciones</span>
            <button type="button" className="fd-ib" onClick={() => setPortions(n + 1)} aria-label="Más raciones">+</button>
            <span className="fd-grow" />
            <button className="fd-ok" onClick={() => onSave({ dish, cook, eat, portions: n })} aria-label="Guardar" title="Guardar"><Icon name="check" size={20} /></button>
          </div>
        </div>
      )}
    </Modal>
  )
}
