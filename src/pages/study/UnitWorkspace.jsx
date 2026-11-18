import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { saveFile } from '../../lib/fileStore.js'
import NotesPane from './NotesPane.jsx'
import DocsTab from './DocsTab.jsx'
import FileFrame from '../../components/FileFrame.jsx'
import Icon from '../../components/Icon.jsx'
import EmptyAdd from './EmptyAdd.jsx'
import NameDialog from '../../components/NameDialog.jsx'
import ShareButton from '../../components/ShareButton.jsx'
import { usePanel } from '../../screens/focus.js'
import ResourceFrames from './ResourceFrames.jsx'
import { changeSubject, changeUnit, practicesOf, reorderUnits, soft } from './helpers.js'

// Pestañas: PDF · Documentos · Recursos (las prácticas viven dentro de Documentos y se abren con su PDF al lado)
const TABS = [['estudio', 'split', 'PDF'], ['documentos', 'doc', 'Documentos'], ['recursos', 'link', 'Recursos']]

/** Libro abierto: hoja izquierda = PDF del profe, hoja derecha = mis apuntes. La hoja marcada va rellena. */
function Book({ left, right }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#202124" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6C10 4.6 7 4.2 3.5 4.6V18.6C7 18.2 10 18.6 12 20Z" fill={left ? '#202124' : 'none'} />
      <path d="M12 6C14 4.6 17 4.2 20.5 4.6V18.6C17 18.2 14 18.6 12 20Z" fill={right ? '#202124' : 'none'} />
    </svg>
  )
}
const LAYOUTS = [['pdf', true, false, 'Solo el PDF del profe'], ['split', true, true, 'PDF y mis apuntes'], ['doc', false, true, 'Solo mis apuntes']]

/**
 * Unidad en modo concentración. El panel de la izquierda muestra las unidades y, al desplegarlas, sus temas y prácticas
 * (con una casilla para marcar lo estudiado). Arriba, la ruta Asignatura › Unidad para volver atrás.
 */
export default function UnitWorkspace({ data, update, subject, unit, route, go, back }) {
  const [panel, setPanel] = usePanel()
  const [ctx, setCtx] = useState(null) // menú de un tema o práctica (clic derecho o mantener pulsado): { x, y, meta, name, onRemove }
  const [inline, setInline] = useState(null) // nombre que se está cambiando ahí mismo (doble clic): { id, value }
  const pressTimer = useRef(null)
  const [dialog, setDialog] = useState(null) // 'topic' | 'practice' | 'unit' | { rename: unitId }
  const [addMenu, setAddMenu] = useState(false)
  const [pdfNew, setPdfNew] = useState(null) // { type: 'topic' | 'practice', file }: se creó subiendo un PDF y falta el nombre
  const [layout, setLayout] = useState('split')
  const [full, setFull] = useState(false) // modo estudio: la ventana ocupa toda la pantalla
  const [panelW, setPanelW] = useState(() => { try { return Math.min(480, Math.max(150, Number(localStorage.getItem('ws-panel-w')) || 250)) } catch { return 250 } })
  const wsRef = useRef(null)
  useEffect(() => { if (!full) return undefined; const k = (e) => e.key === 'Escape' && setFull(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [full])
  // Ajustar el ancho del panel de unidades arrastrando su borde; si se hace muy pequeño, se cierra y queda el icono
  const startResize = (e) => {
    e.preventDefault()
    const z = parseFloat(getComputedStyle(wsRef.current?.closest('.d-app') ?? document.body).zoom) || 1
    const x0 = e.clientX
    const w0 = panelW
    let last = w0
    const move = (ev) => {
      const raw = w0 + (ev.clientX - x0) / z
      if (raw < 110) { end(); setPanel(false); return }
      last = Math.min(480, Math.max(150, raw))
      setPanelW(last)
    }
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); try { localStorage.setItem('ws-panel-w', String(Math.round(last))) } catch { /* sin guardado */ } }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }
  const [open, setOpen] = useState(() => new Set([unit.id])) // unidades desplegadas
  const menuRef = useRef(null)
  const notesIn = useRef(null) // función de los apuntes para pegar texto copiado del PDF
  const tab = route.tab ?? 'estudio'
  const practices = practicesOf(unit)
  const topicIndex = Math.max(0, unit.topics.findIndex((t) => t.id === route.itemId))
  const topic = unit.topics.find((t) => t.id === route.itemId) ?? unit.topics[0]
  const practice = practices.find((p) => p.id === route.itemId) ?? practices[0]

  useEffect(() => { setOpen((s) => (s.has(unit.id) ? s : new Set([...s, unit.id]))) }, [unit.id])
  useEffect(() => { if (!ctx) return undefined; const k = (e) => e.key === 'Escape' && setCtx(null); window.addEventListener('keydown', k); window.addEventListener('scroll', () => setCtx(null), true); return () => window.removeEventListener('keydown', k) }, [ctx])
  useEffect(() => {
    if (!addMenu) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setAddMenu(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [addMenu])

  const changeU = (fn) => changeUnit(update, subject.id, unit.id, fn)
  const setPractices = (fn) => changeU((u) => ({ ...u, practices: fn(practicesOf(u)) }))
  const patchPractice = (id, patch) => setPractices((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const toggleTopic = (uid, tid) => changeUnit(update, subject.id, uid, (u) => ({ ...u, topics: u.topics.map((t) => (t.id === tid ? { ...t, state: t.state === 'clear' ? 'todo' : 'clear' } : t)) }))
  const togglePractice = (uid, pid) => changeUnit(update, subject.id, uid, (u) => ({ ...u, practices: practicesOf(u).map((p) => (p.id === pid ? { ...p, done: !p.done } : p)) }))
  const addTopic = (name) => { const id = crypto.randomUUID(); changeU((u) => ({ ...u, topics: [...u.topics, { id, name, state: 'todo' }] })); setDialog(null); go({ ...route, tab: 'estudio', itemId: id }) }
  const addPractice = (name) => { const id = crypto.randomUUID(); setPractices((l) => [...l, { id, name, done: false }]); setDialog(null); go({ ...route, tab: 'practicas', itemId: id }) }
  // Crear un tema o una práctica ya con su PDF puesto
  const addWithPdf = async (name) => {
    const { type, file } = pdfNew
    setPdfNew(null)
    const desc = await saveFile(file)
    const id = crypto.randomUUID()
    if (type === 'topic') changeU((u) => ({ ...u, topics: [...u.topics, { id, name, state: 'todo', pdfs: [desc] }] }))
    else setPractices((l) => [...l, { id, name, done: false, pdfs: [desc] }])
    go({ ...route, tab: type === 'topic' ? 'estudio' : 'practicas', itemId: id })
  }
  const baseName = (f) => f.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 50)
  const addUnit = (name) => { const id = crypto.randomUUID(); changeSubject(update, subject.id, (s) => ({ ...s, units: [...s.units, { id, name, topics: [] }] })); setDialog(null); go({ ...route, unitId: id, tab: 'estudio', itemId: null }) }
  // Eliminar una unidad; si es la que tengo abierta, vuelvo a la asignatura
  const removeUnit = (id) => { changeSubject(update, subject.id, (s) => ({ ...s, units: s.units.filter((u) => u.id !== id) })); setDialog(null); if (id === unit.id) back() }
  const renameItem = (r, name) => {
    changeUnit(update, subject.id, r.unitId, (u) => (r.type === 'topic'
      ? { ...u, topics: u.topics.map((t) => (t.id === r.id ? { ...t, name } : t)) }
      : { ...u, practices: practicesOf(u).map((p) => (p.id === r.id ? { ...p, name } : p)) }))
    setDialog(null)
  }
  const renameUnit = (id, name) => { changeUnit(update, subject.id, id, (u) => ({ ...u, name })); setDialog(null) }
  const removeTopic = (uid, id) => { if (!window.confirm('¿Quitar este tema y sus apuntes?')) return; changeUnit(update, subject.id, uid, (u) => ({ ...u, topics: u.topics.filter((t) => t.id !== id) })); go({ ...route, itemId: null }) }
  const removePractice = (uid, id) => { if (!window.confirm('¿Quitar esta práctica?')) return; changeUnit(update, subject.id, uid, (u) => ({ ...u, practices: practicesOf(u).filter((p) => p.id !== id) })); go({ ...route, itemId: null }) }
  const toggleOpen = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  // Prácticas: igual que los temas (varios PDF y apuntes). El enunciado y la solución de antes se conservan.
  const practiceFiles = practice ? (practice.pdfs ?? (practice.statement ? [practice.statement] : [])) : []
  const setPracticeFiles = (list) => patchPractice(practice.id, { pdfs: list, statement: undefined })

  // Mover temas y prácticas arrastrando: dentro de una unidad o a otra
  const [dragging, setDragging] = useState(null) // { type, unitId, id }
  const [mark, setMark] = useState(null) // { type, unitId, id, pos } | { type, unitId, end: true }
  const listKey = (type) => (type === 'topic' ? 'topics' : 'practices')
  const itemsOf = (u, type) => (type === 'topic' ? u.topics : practicesOf(u))
  const moveItem = (drag, target) => {
    changeSubject(update, subject.id, (sub) => {
      const key = listKey(drag.type)
      const from = sub.units.find((u) => u.id === drag.unitId)
      const item = itemsOf(from, drag.type).find((x) => x.id === drag.id)
      if (!item) return sub
      const units = sub.units.map((u) => (u.id === drag.unitId ? { ...u, [key]: itemsOf(u, drag.type).filter((x) => x.id !== drag.id) } : u))
      return {
        ...sub,
        units: units.map((u) => {
          if (u.id !== target.unitId) return u
          const list = [...itemsOf(u, drag.type)]
          let at = target.end ? list.length : list.findIndex((x) => x.id === target.id)
          if (at < 0) at = list.length
          if (!target.end && target.pos === 'after') at++
          list.splice(at, 0, item)
          return { ...u, [key]: list }
        }),
      }
    })
    if (drag.id === (drag.type === 'topic' ? topic?.id : practice?.id) && target.unitId !== drag.unitId) go({ ...route, unitId: target.unitId, tab: drag.type === 'topic' ? 'estudio' : 'practicas', itemId: drag.id })
    setDragging(null); setMark(null)
  }
  // Reordenar las propias unidades arrastrando por su cabecera
  const [dragUnit, setDragUnit] = useState(null) // { id, over, after }
  const dropUnit = () => {
    const d = dragUnit
    setDragUnit(null)
    if (d?.over && d.over !== d.id) changeSubject(update, subject.id, (sub) => ({ ...sub, units: reorderUnits(sub.units, d.id, d.over, d.after) }))
  }
  const dragProps = (type, unitId, id) => ({
    draggable: true,
    onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); setDragging({ type, unitId, id }) },
    onDragEnd: () => { setDragging(null); setMark(null) },
    onDragOver: (e) => { if (dragging?.type !== type || dragging.id === id) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const pos = e.clientY < r.top + r.height / 2 ? 'before' : 'after'; setMark((m) => (m?.id === id && m.pos === pos ? m : { type, unitId, id, pos })) },
    onDrop: (e) => { if (dragging?.type !== type || dragging.id === id) return; e.preventDefault(); e.stopPropagation(); moveItem(dragging, { unitId, id, pos: mark?.id === id ? mark.pos : 'before' }) },
  })

  // PDF por tema (puede haber varios). El PDF que antes se guardaba en la unidad se queda en el primer tema.
  const topicFiles = topic ? (topic.pdfs ?? (topic.pdf ? [topic.pdf] : topicIndex === 0 && unit.temario ? [unit.temario] : [])) : []
  const setTopicFiles = (list) => changeU((u) => ({ ...u, ...(topicIndex === 0 ? { temario: undefined } : {}), topics: u.topics.map((t) => (t.id === topic.id ? { ...t, pdfs: list, pdf: undefined } : t)) }))

  const layouts = () => (
    <div className="layouts" role="radiogroup" aria-label="Qué hojas ver">
      {LAYOUTS.map(([id, l, r, label]) => (
        <button key={id} role="radio" aria-checked={layout === id} className={`icon-btn ${layout === id ? 'on' : ''}`} title={label} aria-label={label} onClick={() => setLayout(id)}><Book left={l} right={r} /></button>
      ))}
    </div>
  )
  // Son funciones (no componentes): así React no vuelve a montar el editor cada vez que se pinta
  const split = (left, right) => (
    <div className={`ws-split ws-${layout}`}>
      {layout !== 'doc' && left}
      {layout !== 'pdf' && right}
    </div>
  )
  // Temas y prácticas: sin iconos. Clic derecho (o mantener pulsado) = menú; doble clic = cambiar el nombre ahí mismo; el nombre completo sale al pasar el ratón
  const openCtx = (x, y, meta, name, onRemove) => setCtx({ x, y, meta, name, onRemove })
  const saveInline = () => {
    if (!inline) return
    const v = inline.value.trim()
    if (v) renameItem({ type: inline.type, unitId: inline.unitId, id: inline.id }, v)
    setInline(null)
  }
  const row = (selected, done, onCheck, icon, name, onPick, onRemove, doneLabel, meta) => (
    <div key={meta.id} className={`tp-row ${selected ? 'sel' : ''} ${dragging?.id === meta.id ? 'is-dragging' : ''} ${mark?.id === meta.id ? `drop-${mark.pos}` : ''}`} {...dragProps(meta.type, meta.unitId, meta.id)}
      onContextMenu={(e) => { e.preventDefault(); openCtx(e.clientX, e.clientY, meta, name, onRemove) }}
      onPointerDown={(e) => { if (e.pointerType === 'touch') { const { clientX: x, clientY: y } = e; clearTimeout(pressTimer.current); pressTimer.current = setTimeout(() => openCtx(x, y, meta, name, onRemove), 600) } }}
      onPointerUp={() => clearTimeout(pressTimer.current)} onPointerMove={() => clearTimeout(pressTimer.current)} onPointerCancel={() => clearTimeout(pressTimer.current)}>
      <span className="tp-grip" aria-hidden="true"><Icon name="grip" size={14} color="#9AA0A6" strokeWidth={3} /></span>
      <button className={`chk ${done ? 'on' : ''}`} onClick={onCheck} aria-pressed={done} aria-label={doneLabel} title={done ? 'Estudiado' : 'Marcar como estudiado'}>{done && <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.4} />}</button>
      {icon && <Icon name={icon} size={14} color="#9AA0A6" />}
      {inline?.id === meta.id
        ? <input className="tp-inline" autoFocus value={inline.value} maxLength={60} aria-label="Nombre" onChange={(e) => setInline({ ...inline, value: e.target.value })} onBlur={saveInline}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveInline() } else if (e.key === 'Escape') setInline(null) }} />
        : <button className="tp-name" onClick={onPick} onDoubleClick={() => setInline({ id: meta.id, type: meta.type, unitId: meta.unitId, value: name })} title={`${name}\nDoble clic: cambiar el nombre · Clic derecho: más opciones`}>{name}</button>}
    </div>
  )

  return (
    <div className={`ws ${full ? 'ws-full' : ''}`} ref={wsRef}>
      <nav className="crumbs" aria-label="Ruta">
        <button className="crumb" onClick={back}><i style={{ background: subject.color }} />{subject.short}</button>
        <Icon name="right" size={14} color="#9AA0A6" />
        <span className="crumb is-current" aria-current="page">{unit.name}</span>
      </nav>

      <div className="ws-body">
        {panel && (
          <aside className="card ws-panel" aria-label="Unidades y temas" style={{ width: panelW }}>
            <b className="ws-subject" style={{ borderColor: subject.color }}>{subject.short}</b>
            {subject.units.map((u) => {
              const on = u.id === unit.id
              const isOpen = open.has(u.id)
              const ps = practicesOf(u)
              return (
                <div key={u.id} className={`tp-unit-wrap ${dragUnit?.id === u.id ? 'is-dragging' : ''} ${dragUnit?.over === u.id && dragUnit.id !== u.id ? (dragUnit.after ? 'u-after' : 'u-before') : ''}`}>
                  <div className={`tp-unit ${on ? 'on' : ''} ${mark?.end && mark.unitId === u.id ? 'drop-into' : ''}`}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', u.id); setDragUnit({ id: u.id, over: null, after: false }) }}
                    onDragEnd={() => setDragUnit(null)}
                    onDragOver={(e) => {
                      if (dragUnit) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2; if (dragUnit.over !== u.id || dragUnit.after !== after) setDragUnit({ ...dragUnit, over: u.id, after }); return }
                      if (!dragging) return
                      e.preventDefault(); setMark({ type: dragging.type, unitId: u.id, end: true })
                    }}
                    onDrop={(e) => {
                      if (dragUnit) { e.preventDefault(); dropUnit(); return }
                      if (!dragging) return
                      e.preventDefault(); moveItem(dragging, { unitId: u.id, end: true }); setOpen((o) => new Set([...o, u.id]))
                    }}>
                    <button className="tp-chev" onClick={() => toggleOpen(u.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Plegar' : 'Desplegar'} ${u.name}`}><Icon name={isOpen ? 'down' : 'right'} size={16} /></button>
                    <button className="tp-uname w-ellipsis" onClick={() => { go({ ...route, unitId: u.id, itemId: null }); setOpen((s) => new Set([...s, u.id])) }}>{u.name}</button>
                    <button className="prio-x tp-pen" onClick={() => setDialog({ rename: u.id })} aria-label={`Cambiar el nombre de ${u.name}`}><Icon name="pen" size={14} /></button>
                  </div>
                  {isOpen && (
                    <div className="tp-children">
                      {u.topics.map((t) => row(on && tab === 'estudio' && topic?.id === t.id, t.state === 'clear', () => toggleTopic(u.id, t.id), null, t.name,
                        () => go({ ...route, unitId: u.id, tab: 'estudio', itemId: t.id }), () => removeTopic(u.id, t.id), `Marcar «${t.name}» como estudiado`, { type: 'topic', unitId: u.id, id: t.id }))}
                      {ps.map((p) => row(on && tab === 'practicas' && practice?.id === p.id, !!p.done, () => togglePractice(u.id, p.id), 'code', p.name,
                        () => go({ ...route, unitId: u.id, tab: 'practicas', itemId: p.id }), () => removePractice(u.id, p.id), `Marcar «${p.name}» como hecha`, { type: 'practice', unitId: u.id, id: p.id }))}
                      {!u.topics.length && !ps.length && <span className="tp-empty">Sin temas todavía</span>}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="tp-add" ref={menuRef}>
              <button className="tp-plus" onClick={() => setAddMenu(!addMenu)} aria-label="Añadir" aria-haspopup="menu" aria-expanded={addMenu} title="Añadir"><Icon name="plus" size={18} /></button>
              {addMenu && (
                <div className="card tp-menu" role="menu">
                  <button role="menuitem" onClick={() => { setAddMenu(false); setDialog('topic') }}>Tema</button>
                  <button role="menuitem" onClick={() => { setAddMenu(false); setDialog('practice') }}>Práctica</button>
                  <button role="menuitem" onClick={() => { setAddMenu(false); setDialog('unit') }}>Unidad</button>
                </div>
              )}
            </div>
          </aside>
        )}
        {panel && <div className="ws-resize" role="separator" aria-orientation="vertical" aria-label="Cambiar el ancho del panel de unidades" onPointerDown={startResize} />}

        <div className="ws-main">
          <div className="ws-tabs" role="tablist">
            <button className="icon-btn ws-toggle" onClick={() => setPanel(!panel)} aria-label={panel ? 'Ocultar unidades' : 'Mostrar unidades'} aria-expanded={panel} title={panel ? 'Ocultar unidades' : 'Mostrar unidades'}><Icon name="tree" /></button>
            {TABS.map(([id, icon, label]) => (
              <button key={id} role="tab" aria-selected={tab === id || (id === 'documentos' && tab === 'practicas')} className={`ws-tab ${tab === id || (id === 'documentos' && tab === 'practicas') ? 'on' : ''}`} onClick={() => go({ ...route, tab: id, itemId: null })}>
                <Icon name={icon} size={18} />{label}
              </button>
            ))}
            {tab !== 'recursos' && tab !== 'documentos' && layouts()}
            <div className="layouts ws-mode"><button className={`icon-btn ws-full-btn ${full ? 'on' : ''}`} onClick={() => setFull(!full)} aria-pressed={full} aria-label={full ? 'Salir del modo estudio' : 'Modo estudio: ocupar toda la pantalla'} title={full ? 'Salir del modo estudio (Esc)' : 'Modo estudio'}><Icon name={full ? 'shrink' : 'expand'} size={20} /></button></div>
          </div>

          {tab === 'estudio' && (
            topic
              ? split(<FilesPane key={`pdf-${topic.id}`} files={topicFiles} onChange={setTopicFiles} label="Subir el PDF de este tema" onPickText={(t) => notesIn.current?.(t)} />,
                  <NotesPane key={topic.id} item={topic} kind="topic" unit={unit} subject={subject} data={data} update={update} notesIn={notesIn} label={`Apuntes de ${topic.name}`} />)
              : <EmptyAdd icon="book" title="PDF" text="Aquí irán los temas de la unidad y tus apuntes." createLabel="Crear tema" onCreate={() => setDialog('topic')} onPdf={(file) => setPdfNew({ type: 'topic', file })} />
          )}

          {tab === 'practicas' && (
            practice
              ? <div className="dt-open">
                <div className="dt-bar">
                  <button className="icon-btn" onClick={() => go({ ...route, tab: 'documentos', itemId: null })} aria-label="Volver a Documentos" title="Volver a Documentos"><Icon name="back" size={18} /></button>
                  <b className="w-ellipsis">{data.notesName?.[practice.id] || practice.name}</b>
                  <span className="dt-pill" style={{ background: '#FFE2C2', color: '#F08A24' }}>Práctica</span>
                </div>
                {split(<FilesPane key={`pf-${practice.id}`} files={practiceFiles} onChange={setPracticeFiles} label="Subir el PDF de esta práctica" onPickText={(t) => notesIn.current?.(t)} />,
                  <NotesPane key={practice.id} item={practice} kind="practice" unit={unit} subject={subject} data={data} update={update} notesIn={notesIn} label={`Apuntes de ${practice.name}`} />)}
              </div>
              : <EmptyAdd icon="code" title="Prácticas" text="Aquí irán las prácticas de la asignatura." createLabel="Crear práctica" onCreate={() => setDialog('practice')} onPdf={(file) => setPdfNew({ type: 'practice', file })} />
          )}

          {tab === 'documentos' && <DocsTab data={data} update={update} subject={subject} route={route} go={go} onNewPractice={addPractice} onRemovePractice={removePractice} />}

          {tab === 'recursos' && <ResourceFrames data={data} update={update} subjectId={subject.id} unitId={unit.id} />}
        </div>
      </div>

      {dialog === 'topic' && <NameDialog title="Nombre del tema" placeholder="Estados de un proceso" onSubmit={addTopic} onClose={() => setDialog(null)} />}
      {dialog === 'practice' && <NameDialog title="Nombre de la práctica" placeholder="Práctica 1" onSubmit={addPractice} onClose={() => setDialog(null)} />}
      {pdfNew && <NameDialog title={`Nombre ${pdfNew.type === 'topic' ? 'del tema' : 'de la práctica'}`} initial={baseName(pdfNew.file)} onSubmit={addWithPdf} onClose={() => setPdfNew(null)} />}
      {dialog === 'unit' && <NameDialog title="Nombre de la unidad" placeholder="Hilos y concurrencia" onSubmit={addUnit} onClose={() => setDialog(null)} />}
      {ctx && createPortal(
        <div className="tp-ctx-wrap" onPointerDown={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null) }}>
          <div className="card tp-ctx" role="menu" style={{ left: Math.min(ctx.x, window.innerWidth - 190), top: Math.min(ctx.y, window.innerHeight - 110) }} onPointerDown={(e) => e.stopPropagation()}>
            <b className="tp-ctx-t w-ellipsis">{ctx.name}</b>
            <button role="menuitem" onClick={() => { const c = ctx; setCtx(null); setInline({ id: c.meta.id, type: c.meta.type, unitId: c.meta.unitId, value: c.name }) }}><Icon name="pen" size={16} />Cambiar nombre</button>
            <button role="menuitem" className="is-danger" onClick={() => { const c = ctx; setCtx(null); c.onRemove() }}><Icon name="trash" size={16} />Eliminar</button>
          </div>
        </div>, document.body)}
      {dialog?.renameItem && <NameDialog title={dialog.renameItem.type === 'topic' ? 'Nombre del tema' : 'Nombre de la práctica'} initial={dialog.renameItem.name} onSubmit={(n) => renameItem(dialog.renameItem, n)} onClose={() => setDialog(null)} />}
      {dialog?.rename && <NameDialog title="Nombre de la unidad" initial={subject.units.find((u) => u.id === dialog.rename)?.name} onSubmit={(n) => renameUnit(dialog.rename, n)} onDelete={() => removeUnit(dialog.rename)} deleteLabel="Eliminar unidad" deleteWarning="Se borrarán todos sus temas, apuntes y prácticas. No se puede deshacer." onClose={() => setDialog(null)} />}
    </div>
  )
}

/** Los PDF de un tema: pestañas con sus nombres, el visor del que elijas y un + para añadir otro. */
function FilesPane({ files, onChange, label, onPickText }) {
  const [idx, setIdx] = useState(0)
  const input = useRef(null)
  const i = Math.min(idx, Math.max(files.length - 1, 0))
  const addOther = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    onChange([...files, await saveFile(f)])
    setIdx(files.length)
  }
  return (
    <div className="files-pane">
      <input ref={input} type="file" accept="application/pdf,image/*" hidden onChange={addOther} />
      <FileFrame key={files[i]?.id ?? 'empty'} file={files[i] ?? null} label={label} onPickText={onPickText}
        extra={files.length > 0 && (
          <>
            {files.length > 1 && (
              <span className="file-switch" role="group" aria-label="PDF de este tema">
                <button className="icon-btn" onClick={() => setIdx((i - 1 + files.length) % files.length)} aria-label="PDF anterior"><Icon name="left" size={16} /></button>
                <b>{i + 1}/{files.length}</b>
                <button className="icon-btn" onClick={() => setIdx((i + 1) % files.length)} aria-label="PDF siguiente"><Icon name="right" size={16} /></button>
              </span>
            )}
            <button className="icon-btn" onClick={() => input.current?.click()} aria-label="Añadir otro PDF" title="Añadir otro PDF"><Icon name="plus" size={20} /></button>
          </>
        )}
        onChange={(f) => onChange(f ? (files.length ? files.map((x, k) => (k === i ? f : x)) : [f]) : files.filter((_, k) => k !== i))} />
    </div>
  )
}
