import { useState } from 'react'
import TopActions from '../../components/TopActions.jsx'
import BlockEdit from '../../components/BlockEdit.jsx'
import Icon from '../../components/Icon.jsx'
import { progressFor, soft, SUBJECT_COLORS } from './helpers.js'
import Deliveries from './Deliveries.jsx'
import QuickNote from './QuickNote.jsx'
import Schedule from './Schedule.jsx'
import Tools from './Tools.jsx'

const DEFAULT_BLOCKS = [
  { id: 'entregas', type: 'entregas', span: 1 },
  { id: 'tools', type: 'tools', span: 1 },
  { id: 'note-1', type: 'note', span: 1 },
  { id: 'schedule', type: 'schedule', span: 3 },
]
/** Ancho (1-3 columnas) del primer hueco libre del tablero; si no hay hueco, una fila entera. */
function freeSpan(blocks) {
  let col = 0
  for (const b of blocks) {
    const w = Math.min(b.span, 3)
    if (col + w > 3) { if (col > 0) return 3 - col; col = 0 }
    col += w
    if (col === 3) col = 0
  }
  return col > 0 ? 3 - col : 3
}

const LABELS = { entregas: 'Próximas entregas', tools: 'Herramientas', schedule: 'Horario' }
const ICONS = { entregas: 'exam', tools: 'link', schedule: 'clock' }

/**
 * Planificador de estudios: asignaturas arriba y debajo bloques que se pueden personalizar
 * (mover, cambiar de tamaño, quitar, añadir notas). El botón del tablero activa el modo edición.
 */
export default function Planner({ data, update, openSubject }) {
  const subjects = data.subjects ?? []
  const blocks = data.planner?.blocks ?? DEFAULT_BLOCKS
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false) // selector abierto dentro del cuadrado vacío
  const [short, setShort] = useState('')

  const setBlocks = (fn) => update((d) => ({ ...d, planner: { ...(d.planner ?? {}), blocks: fn(d.planner?.blocks ?? DEFAULT_BLOCKS) } }))
  const move = (i, dir) => setBlocks((b) => { const n = [...b]; const j = i + dir; if (j < 0 || j >= n.length) return b; [n[i], n[j]] = [n[j], n[i]]; return n })
  const setSpan = (id, span) => setBlocks((b) => b.map((x) => (x.id === id ? { ...x, span } : x)))
  const removeBlock = (blk) => {
    setBlocks((b) => b.filter((x) => x.id !== blk.id))
    if (blk.type === 'note') update((d) => { const q = { ...(d.quickNotes ?? {}) }; delete q[blk.id]; return { ...d, quickNotes: q } })
  }
  const addBlock = (type) => { setBlocks((b) => [...b, { id: type === 'note' ? crypto.randomUUID() : type, type, span: type === 'schedule' ? 3 : 1 }]); setAdding(false) }
  const missing = Object.keys(LABELS).filter((t) => !blocks.some((b) => b.type === t))

  const addSubject = (e) => {
    e.preventDefault()
    const v = short.trim().toUpperCase()
    if (!v) return
    update((d) => { const list = d.subjects ?? []; return { ...d, subjects: [...list, { id: crypto.randomUUID(), short: v, name: v, color: SUBJECT_COLORS[list.length % SUBJECT_COLORS.length], units: [{ id: crypto.randomUUID(), name: 'Bloque 1', topics: [] }] }] } })
    setShort('')
  }

  const render = (b) => {
    if (b.type === 'entregas') return <Deliveries data={data} update={update} subjects={subjects} />
    if (b.type === 'tools') return <Tools data={data} update={update} />
    if (b.type === 'schedule') return <Schedule data={data} update={update} subjects={subjects} />
    const note = data.quickNotes?.[b.id] ?? { html: '' }
    return <QuickNote note={note} onChange={(n) => update((d) => ({ ...d, quickNotes: { ...(d.quickNotes ?? {}), [b.id]: n } }))} onDelete={() => removeBlock(b)} />
  }

  return (
    <div className="page study">
      <header className="page-head">
        <h1 className="sr-only">Planificador de estudios</h1>
        <span />
        <TopActions><div className="page-actions">
          <button className={`icon-btn customize ${editing ? 'customize-on' : ''}`} onClick={() => { setEditing(!editing); setAdding(false) }}
            aria-label={editing ? 'Terminar de personalizar' : 'Personalizar'} title={editing ? 'Listo' : 'Personalizar'}>
            <Icon name={editing ? 'check' : 'board'} color={editing ? '#FFFFFF' : '#202124'} />
          </button>
        </div></TopActions>
      </header>

      <h2 className="page-h2">Asignaturas</h2>
      <div className="subject-cards">
        {subjects.map((s, i) => {
          const p = progressFor(s, data.assignments)
          return (
            <button key={s.id} className="card subject-card" style={{ '--i': i, borderTop: `6px solid ${soft(s.color)}` }} onClick={() => openSubject(s.id)}>
              <span className="w-row"><b>{s.short}</b><b className={p.pct ? '' : 'pct-zero'}>{p.pct} %</b></span>
              <span className="bar bar-track"><span style={{ width: `${p.pct}%`, background: soft(s.color) }} /></span>
            </button>
          )
        })}
        <form className="card subject-card subject-add" onSubmit={addSubject}>
          <input placeholder="Asignatura" value={short} onChange={(e) => setShort(e.target.value)} maxLength={14} aria-label="Nueva asignatura (Enter para añadir)" enterKeyHint="done" />

        </form>
      </div>

      <div className={`plan-grid ${editing ? 'is-editing' : ''}`}>
        {blocks.map((b, i) => (
          <section key={b.id} className={`plan-block span-${b.span} ${b.type === 'note' ? 'is-note' : 'card'}`}>
            {editing && <BlockEdit span={b.span} onSpan={(n) => setSpan(b.id, n)} onRemove={() => removeBlock(b)} onMove={(dir) => move(i, dir)} first={i === 0} last={i === blocks.length - 1} />}
            {render(b)}
          </section>
        ))}
        {editing && <AddSquare span={freeSpan(blocks)} open={adding} onOpen={setAdding} options={[{ type: 'note', label: 'Nota', icon: 'note' }, ...missing.map((t) => ({ type: t, label: LABELS[t], icon: ICONS[t] }))]} onPick={addBlock} />}
      </div>
    </div>
  )
}

/**
 * Cuadrado vacío con un + que ocupa el hueco libre. Al pulsarlo se abre dentro un selector
 * con lo que puedes añadir (notas siempre; el resto solo si no lo tienes ya).
 */
function AddSquare({ span, open, onOpen, options, onPick }) {
  if (!open) {
    return (
      <button className={`add-square span-${span}`} onClick={() => onOpen(true)} aria-label="Añadir un bloque" title="Añadir un bloque">
        <span className="add-square-plus"><Icon name="plus" size={30} /></span>
      </button>
    )
  }
  return (
    <div className={`add-square is-open span-${span}`} role="group" aria-label="Elige qué añadir">
      <button className="icon-btn add-square-close" onClick={() => onOpen(false)} aria-label="Cancelar"><Icon name="close" size={20} /></button>
      <div className="add-square-grid">
        {options.map((o) => (
          <button key={o.type} className="add-tile" onClick={() => onPick(o.type)}><Icon name={o.icon} size={28} /><span>{o.label}</span></button>
        ))}
      </div>
    </div>
  )
}
