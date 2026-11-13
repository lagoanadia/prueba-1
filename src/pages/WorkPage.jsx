import { useState } from 'react'
import TopActions from '../components/TopActions.jsx'
import BlockEdit from '../components/BlockEdit.jsx'
import useBlockDrag from '../hooks/useBlockDrag.js'
import useExitEdit from '../hooks/useExitEdit.js'
import Icon from '../components/Icon.jsx'
import Focus from '../widgets/trabajo/Focus.jsx'
import QuickNote from './study/QuickNote.jsx'
import Tools from './study/Tools.jsx'
import AgendaBlock from './work/AgendaBlock.jsx'
import BoardBlock from './work/BoardBlock.jsx'
import ProjectsBlock from './work/ProjectsBlock.jsx'
import ProjectView from './work/ProjectView.jsx'

// Bloques de la página. span = ancho (1-3 columnas); tall = ocupa dos filas
const DEFAULT_BLOCKS = [
  { id: 'projects', type: 'projects', span: 3 },
  { id: 'board', type: 'board', span: 3 },
  { id: 'agenda', type: 'agenda', span: 2, tall: true },
  { id: 'tools', type: 'tools', span: 1 },
  { id: 'focus', type: 'focus', span: 1 },
]
const BLOCKS = {
  projects: { label: 'Proyectos', icon: 'trabajo' },
  board: { label: 'Tablero', icon: 'board' },
  agenda: { label: 'Agenda', icon: 'calendario' },
  tools: { label: 'Herramientas', icon: 'link' },
  focus: { label: 'Foco', icon: 'clock' },
}

/**
 * Trabajo: todo en bloques del mismo estilo (como el planificador de Estudios), que se pueden
 * mover, ensanchar, quitar y añadir con el botón del tablero. Cada bloque se identifica con su icono.
 */
export default function WorkPage({ data, update }) {
  const blocks = data.workBlocks ?? DEFAULT_BLOCKS
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState(false)
  const [open, setOpen] = useState(null) // proyecto abierto por dentro

  const setBlocks = (fn) => update((d) => ({ ...d, workBlocks: fn(d.workBlocks ?? DEFAULT_BLOCKS) }))
  const dnd = useBlockDrag(setBlocks, editing)
  useExitEdit(editing, () => { setEditing(false); setMenu(false) }, '.plan-block, .page-actions, .customize, .popup')
  const move = (i, dir) => setBlocks((b) => { const n = [...b]; const j = i + dir; if (j < 0 || j >= n.length) return b; [n[i], n[j]] = [n[j], n[i]]; return n })
  const setSpan = (id, span) => setBlocks((b) => b.map((x) => (x.id === id ? { ...x, span } : x)))
  const removeBlock = (blk) => {
    setBlocks((b) => b.filter((x) => x.id !== blk.id))
    if (blk.type === 'note') update((d) => { const q = { ...(d.quickNotes ?? {}) }; delete q[blk.id]; return { ...d, quickNotes: q } })
  }
  const addBlock = (type) => {
    setBlocks((b) => [...b, { id: type === 'note' ? crypto.randomUUID() : type, type, span: type === 'board' || type === 'projects' ? 3 : type === 'agenda' ? 2 : 1, tall: type === 'agenda' }])
    setMenu(false)
  }
  const missing = Object.keys(BLOCKS).filter((t) => !blocks.some((b) => b.type === t))

  const render = (b) => {
    switch (b.type) {
      case 'projects': return <ProjectsBlock data={data} update={update} openProject={(id) => { setOpen(id); window.scrollTo?.({ top: 0 }) }} />
      case 'board': return <BoardBlock data={data} update={update} />
      case 'agenda': return <AgendaBlock data={data} update={update} />
      case 'tools': return <Tools data={data} update={update} bare />
      case 'focus': return <div className="wk-focus"><Focus size="T" data={data} update={update} /></div>
      default: {
        const note = data.quickNotes?.[b.id] ?? { html: '' }
        return <QuickNote note={note} onChange={(n) => update((d) => ({ ...d, quickNotes: { ...(d.quickNotes ?? {}), [b.id]: n } }))} onDelete={() => removeBlock(b)} />
      }
    }
  }

  if (open && (data.projects ?? []).some((p) => p.id === open)) return <ProjectView data={data} update={update} projectId={open} back={() => setOpen(null)} />

  return (
    <div className="page work">
      <header className="page-head wk-head">
        <h1 className="sr-only">Trabajo</h1>
        <span />
        <TopActions><div className="page-actions">
          {editing && (
            <div className="add-wrap">
              <button className="icon-btn" onClick={() => setMenu(!menu)} aria-label="Añadir bloque" aria-expanded={menu} title="Añadir"><Icon name="plus" size={22} /></button>
              {menu && (
                <div className="card add-menu" role="menu">
                  <button role="menuitem" onClick={() => addBlock('note')}><Icon name="note" size={20} />Nota</button>
                  {missing.map((t) => <button role="menuitem" key={t} onClick={() => addBlock(t)}><Icon name={BLOCKS[t].icon} size={20} />{BLOCKS[t].label}</button>)}
                </div>
              )}
            </div>
          )}
          <button className={`icon-btn customize ${editing ? 'customize-on' : ''}`} onClick={() => { setEditing(!editing); setMenu(false) }}
            aria-label={editing ? 'Terminar de personalizar' : 'Personalizar'} title={editing ? 'Listo' : 'Personalizar'}>
            <Icon name={editing ? 'check' : 'board'} color={editing ? '#FFFFFF' : '#202124'} />
          </button>
        </div></TopActions>
      </header>

      <div className={`plan-grid wk-grid ${editing ? 'is-editing' : ''}`}>
        {blocks.map((b, i) => (
          <section key={b.id} className={`plan-block wk-block wk-${b.type} span-${b.span} ${b.tall ? 'is-tall' : ''} ${b.type === 'note' ? 'is-note' : 'card'} ${dnd.cls(b)}`} aria-label={BLOCKS[b.type]?.label ?? 'Nota'} {...dnd.props(b)}>
            {BLOCKS[b.type] && <span className="wk-badge" title={BLOCKS[b.type].label}><Icon name={BLOCKS[b.type].icon} size={18} /></span>}
            {editing && <BlockEdit span={b.span} onSpan={(n) => setSpan(b.id, n)} onRemove={() => removeBlock(b)} onMove={(dir) => move(i, dir)} first={i === 0} last={i === blocks.length - 1} />}
            {render(b)}
          </section>
        ))}
      </div>
    </div>
  )
}
