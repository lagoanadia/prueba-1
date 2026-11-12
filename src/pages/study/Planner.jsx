import { useEffect, useState } from 'react'
import TopActions from '../../components/TopActions.jsx'
import AddRow from '../../components/AddRow.jsx'
import BlockEdit from '../../components/BlockEdit.jsx'
import useEditBoard from '../../hooks/useEditBoard.js'
import Icon from '../../components/Icon.jsx'
import { progressFor, soft, SUBJECT_PALETTE } from './helpers.js'
import Deliveries from './Deliveries.jsx'
import QuickNote from './QuickNote.jsx'
import Schedule from './Schedule.jsx'
import Tools from './Tools.jsx'

const DEFAULT_BLOCKS = [
  { id: 'entregas', type: 'entregas', span: 1 },
  { id: 'examenes', type: 'examenes', span: 1 },
  { id: 'tools', type: 'tools', span: 1 },
  { id: 'note-1', type: 'note', span: 1 },
  { id: 'schedule', type: 'schedule', span: 3 },
]
const LABELS = { entregas: 'Próximas entregas', examenes: 'Exámenes', tools: 'Herramientas', schedule: 'Horario' }
const ICONS = { entregas: 'doc', examenes: 'exam', tools: 'link', schedule: 'clock' }

/**
 * Planificador de estudios: asignaturas arriba y debajo bloques que se pueden personalizar
 * (arrastrar para mover, cambiar de tamaño, quitar, añadir). El botón del tablero activa el modo edición.
 */
export default function Planner({ data, update, openSubject }) {
  const subjects = data.subjects ?? []
  const blocks = data.planner?.blocks ?? DEFAULT_BLOCKS
  const [editing, setEditing] = useState(false)
  const [short, setShort] = useState('')

  // Los exámenes ahora son un widget aparte: si ya tenías exámenes guardados, se añade el bloque una sola vez para que sigan a la vista
  useEffect(() => {
    if (data.planner?.examsMigrated) return
    update((d) => {
      const cur = d.planner?.blocks ?? DEFAULT_BLOCKS
      const hasExam = (d.assignments ?? []).some((a) => a.kind === 'examen')
      const next = hasExam && !cur.some((b) => b.type === 'examenes') ? [...cur, { id: 'examenes', type: 'examenes', span: 1 }] : cur
      return { ...d, planner: { ...(d.planner ?? {}), blocks: next, examsMigrated: true } }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setBlocks = (fn) => update((d) => ({ ...d, planner: { ...(d.planner ?? {}), blocks: fn(d.planner?.blocks ?? DEFAULT_BLOCKS) } }))
  const move = (i, dir) => setBlocks((b) => { const n = [...b]; const j = i + dir; if (j < 0 || j >= n.length) return b; [n[i], n[j]] = [n[j], n[i]]; return n })
  const setSpan = (id, span) => setBlocks((b) => b.map((x) => (x.id === id ? { ...x, span } : x)))
  const removeBlock = (blk) => {
    setBlocks((b) => b.filter((x) => x.id !== blk.id))
    if (blk.type === 'note') update((d) => { const q = { ...(d.quickNotes ?? {}) }; delete q[blk.id]; return { ...d, quickNotes: q } })
  }
  // before = id del bloque delante del que se coloca (al arrastrarlo); sin él, al final
  const addBlock = (type, before = null) => setBlocks((b) => {
    const blk = { id: type === 'note' ? crypto.randomUUID() : type, type, span: type === 'schedule' ? 3 : 1 }
    const at = before ? b.findIndex((x) => x.id === before) : -1
    return at < 0 ? [...b, blk] : [...b.slice(0, at), blk, ...b.slice(at)]
  })
  const missing = Object.keys(LABELS).filter((t) => !blocks.some((b) => b.type === t))
  const edit = useEditBoard({ editing, setEditing, setBlocks, onAdd: addBlock })

  const addSubject = (e) => {
    e.preventDefault()
    const v = short.trim().toUpperCase()
    if (!v) return
    update((d) => { const list = d.subjects ?? []; return { ...d, subjects: [...list, { id: crypto.randomUUID(), short: v, name: v, color: SUBJECT_PALETTE[list.length % SUBJECT_PALETTE.length], units: [{ id: crypto.randomUUID(), name: 'Bloque 1', topics: [] }] }] } })
    setShort('')
  }

  const render = (b) => {
    if (b.type === 'entregas') return <Deliveries data={data} update={update} subjects={subjects} />
    if (b.type === 'examenes') return <Deliveries data={data} update={update} subjects={subjects} exams />
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
          <button className={`icon-btn customize ${editing ? 'customize-on' : ''}`} onClick={() => setEditing(!editing)}
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
            <button key={s.id} className="card subject-card" style={{ '--i': i, borderTop: `6px solid ${s.color}` }} onClick={() => openSubject(s.id)}>
              <span className="w-row"><b>{s.short}</b><b className={p.pct ? '' : 'pct-zero'}>{p.pct} %</b></span>
              <span className="bar bar-track" style={{ background: soft(s.color, 40), height: 10 }}><span style={{ width: `${p.pct}%`, background: s.color }} /></span>
            </button>
          )
        })}
        <form className="card subject-card subject-add" onSubmit={addSubject}>
          <input placeholder="Asignatura" value={short} onChange={(e) => setShort(e.target.value)} maxLength={14} aria-label="Nueva asignatura (Enter para añadir)" enterKeyHint="done" />

        </form>
      </div>

      <div className={`plan-grid ${editing ? 'is-editing' : ''}`}>
        {blocks.map((b, i) => (
          <section key={b.id} {...edit.blockProps(b.id)} className={`plan-block span-${b.span} ${b.type === 'note' ? 'is-note' : 'card'} ${edit.dragId === b.id ? 'is-dragging' : ''}`}>
            {editing && <BlockEdit span={b.span} onSpan={(n) => setSpan(b.id, n)} onRemove={() => removeBlock(b)} onMove={(dir) => move(i, dir)} first={i === 0} last={i === blocks.length - 1} />}
            {render(b)}
          </section>
        ))}
        {editing && <AddRow options={[{ type: 'note', label: 'Nota', icon: 'note' }, ...missing.map((t) => ({ type: t, label: LABELS[t], icon: ICONS[t] }))]} onPick={(t) => addBlock(t)} tileDown={edit.tileDown} ghost={edit.ghost} />}
      </div>
    </div>
  )
}

