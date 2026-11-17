import { useState } from 'react'
import DishForm from './food/DishForm.jsx'
import MenuCard from './food/MenuCard.jsx'
import Cookbook from './food/Cookbook.jsx'
import ShoppingCard from './food/ShoppingCard.jsx'
import BatchCard from './food/BatchCard.jsx'
import Icon from '../components/Icon.jsx'
import TopActions from '../components/TopActions.jsx'
import BlockEdit from '../components/BlockEdit.jsx'
import useBlockDrag from '../hooks/useBlockDrag.js'
import useExitEdit from '../hooks/useExitEdit.js'
import { AddSquare, freeSpan } from './study/Planner.jsx'
import { dishesOf } from '../widgets/comida/food.js'

// Bloques de la página (se pueden mover, cambiar de ancho, quitar y volver a añadir, como en Estudios)
const BLOCKS = {
  menu: { label: 'Menú de la semana', icon: 'calendario', span: 3 },
  cookbook: { label: 'Recetario', icon: 'note', span: 2 },
  save: { label: 'Guardar comida', icon: 'plus', span: 1 },
  shopping: { label: 'Lista de la compra', icon: 'list', span: 1 },
  batch: { label: 'Batch cooking', icon: 'clock', span: 1 },
}
const DEFAULT_BLOCKS = Object.entries(BLOCKS).map(([type, b]) => ({ id: type, type, span: b.span }))

/**
 * Comida: menú de la semana arriba; debajo el recetario y, a un lado, guardar comida,
 * lista de la compra y batch cooking. Las recetas se arrastran al menú, a la compra o al batch.
 * Con el botón del tablero se personaliza: mover, ancho, quitar y añadir bloques.
 */
export default function FoodPage({ data, update }) {
  const blocks = data.foodBlocks ?? DEFAULT_BLOCKS
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const setBlocks = (fn) => update((d) => ({ ...d, foodBlocks: fn(d.foodBlocks ?? DEFAULT_BLOCKS) }))
  const dnd = useBlockDrag(setBlocks, editing)
  useExitEdit(editing, () => { setEditing(false); setAdding(false) }, '.plan-block, .page-actions, .customize, .popup, .add-square')
  const move = (i, dir) => setBlocks((b) => { const n = [...b]; const j = i + dir; if (j < 0 || j >= n.length) return b; [n[i], n[j]] = [n[j], n[i]]; return n })
  const setSpan = (id, span) => setBlocks((b) => b.map((x) => (x.id === id ? { ...x, span } : x)))
  const removeBlock = (blk) => setBlocks((b) => b.filter((x) => x.id !== blk.id))
  const addBlock = (type) => { setBlocks((b) => [...b, { id: type, type, span: BLOCKS[type].span }]); setAdding(false) }
  const missing = Object.keys(BLOCKS).filter((t) => !blocks.some((b) => b.type === t))

  const saveDish = (dish) => {
    const id = crypto.randomUUID()
    update((d) => ({ ...d, activeDish: id, dishes: [...dishesOf(d), { id, time: null, ...dish }] }))
  }
  const render = (b) => {
    if (b.type === 'menu') return <MenuCard data={data} update={update} />
    if (b.type === 'cookbook') return <Cookbook data={data} update={update} />
    if (b.type === 'shopping') return <ShoppingCard data={data} update={update} />
    if (b.type === 'batch') return <BatchCard data={data} update={update} />
    return (
      <section className="card fd-card" aria-label="Guardar comida">
        <div className="fd-title"><span className="dot-food" aria-hidden="true" /><b>Guardar comida</b></div>
        <DishForm onSave={saveDish} />
      </section>
    )
  }
  // El recetario ancho ocupa el alto de las tarjetas pequeñas que tiene al lado (como antes)
  // (tantas filas como tarjetas estrechas haya, hasta 3), así no quedan huecos debajo
  const narrow = blocks.filter((b) => b.span === 1).length
  const rowsOf = (b) => (b.type === 'cookbook' && b.span === 2 ? Math.max(1, Math.min(3, narrow + (editing && missing.length ? 1 : 0))) : 1)

  return (
    <div className="page food">
      <header className="page-head">
        <h1 className="sr-only">Comida</h1>
        <span />
        <TopActions><div className="page-actions">
          <button className={`icon-btn customize ${editing ? 'customize-on' : ''}`} onClick={() => { setEditing(!editing); setAdding(false) }}
            aria-label={editing ? 'Terminar de personalizar' : 'Personalizar'} title={editing ? 'Listo' : 'Personalizar'}>
            <Icon name={editing ? 'check' : 'board'} color={editing ? '#FFFFFF' : '#202124'} />
          </button>
        </div></TopActions>
      </header>
      <div className={`plan-grid fd-grid ${editing ? 'is-editing' : ''}`}>
        {blocks.map((b, i) => (
          <section key={b.id} className={`plan-block fd-block span-${b.span} ${rowsOf(b) > 1 ? 'fd-tall' : ''} ${dnd.cls(b)}`} style={{ gridRow: `span ${rowsOf(b)}` }} aria-label={BLOCKS[b.type]?.label} {...dnd.props(b)}>
            {editing && <BlockEdit span={b.span} onSpan={(n) => setSpan(b.id, n)} onRemove={() => removeBlock(b)} onMove={(dir) => move(i, dir)} first={i === 0} last={i === blocks.length - 1} name={BLOCKS[b.type]?.label} />}
            {render(b)}
          </section>
        ))}
        {editing && missing.length > 0 && <AddSquare span={blocks.some((b) => b.type === 'cookbook' && b.span === 2) ? 1 : freeSpan(blocks)} open={adding} onOpen={setAdding} options={missing.map((t) => ({ type: t, label: BLOCKS[t].label, icon: BLOCKS[t].icon }))} onPick={addBlock} />}
      </div>
    </div>
  )
}
