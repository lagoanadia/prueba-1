import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import ExportDialog from './ExportDialog.jsx'
import CodeBlock from './blocks/CodeBlock.jsx'
import ImageBlock from './blocks/ImageBlock.jsx'
import TableBlock from './blocks/TableBlock.jsx'
import { BLOCK_TYPES, newBlock, toBlocks, toDoc } from '../lib/docModel.js'
import { sanitize } from '../lib/richText.js'

// Atajos de escritura: «# » título, «- » puntos, «1. » numerada, «[] » tareas, «> » cita
const SHORTCUTS = [[/^#\s$/, 'h1'], [/^##\s$/, 'h2'], [/^###\s$/, 'h3'], [/^[-*]\s$/, 'bullet'], [/^1\.\s$/, 'numbered'], [/^\[\]\s$/, 'todo'], [/^>\s$/, 'quote']]
// Sin tildes ni mayúsculas, para que «tit» encuentre «Título»
const norm = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const strip = (html) => (html ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
const TEXTY = ['text', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'todo', 'quote', 'callout']
const LIST = ['bullet', 'numbered', 'todo']
const isEmpty = (b) => (TEXTY.includes(b.type) ? !strip(b.html) : b.type === 'code' ? !b.code : false)

/**
 * Editor de documentos por bloques (estilo Notion).
 *  - Al pasar el ratón por el hueco entre bloques sale un «+» que crea una caja de texto ahí.
 *  - Escribe «+» o «/» al empezar un bloque y se despliegan los tipos (lista, tabla, foto, código…).
 *  - Enter crea otro bloque; Ctrl+B / I / U da formato; Alt+↑/↓ mueve el bloque.
 *  - Pulsar en cualquier parte de la página escribe al final.
 * `value` = lo guardado; `onChange(doc)` guarda; `bar` = botones extra para la barra (p. ej. Compartir).
 * Cambia la `key` para abrir otro documento.
 */
export default function BlockEditor({ value, onChange, label = 'Documento', bar = null, appendRef = null, exportAs = null }) {
  const [blocks, setBlocks] = useState(() => toBlocks(value))
  const [focusId, setFocusId] = useState(null)
  const [menu, setMenu] = useState(null) // { id, q, i, x, y }
  const [exporting, setExporting] = useState(false)
  const [drag, setDrag] = useState(null) // { id, over, after } al arrastrar un bloque por su asa
  const [rowMenu, setRowMenu] = useState(null) // id del bloque con el menú del asa abierto
  const refs = useRef({})
  const pageRef = useRef(null)

  const commit = (next) => { setBlocks(next); onChange(toDoc(next)) }
  const patch = (id, p) => commit(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)))
  const indexOf = (id) => blocks.findIndex((b) => b.id === id)
  const insertAt = (index, b) => { const n = [...blocks]; n.splice(index, 0, b); commit(n); setFocusId(b.id) }
  const insertAfter = (id, b) => insertAt(indexOf(id) + 1, b)
  const remove = (id) => { const i = indexOf(id); const n = blocks.filter((b) => b.id !== id); commit(n.length ? n : [newBlock()]); setFocusId((n[i - 1] ?? n[0])?.id ?? null) }
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; commit(n) }
  const dropDrag = () => {
    if (!drag?.over || drag.over === drag.id) { setDrag(null); return }
    const item = blocks.find((b) => b.id === drag.id)
    const rest = blocks.filter((b) => b.id !== drag.id)
    const at = rest.findIndex((b) => b.id === drag.over) + (drag.after ? 1 : 0)
    rest.splice(at, 0, item)
    commit(rest)
    setDrag(null)
  }
  const duplicate = (id) => { const i = indexOf(id); const b = blocks[i]; const n = [...blocks]; n.splice(i + 1, 0, { ...b, id: crypto.randomUUID() }); commit(n); setRowMenu(null) }
  const toText = (id) => commit(blocks.map((b) => (b.id === id ? { id, type: 'text', html: '' } : b)))

  // Al escribir tras «+» o «/» se quedan solo los tipos cuya palabra empieza por lo escrito (primero los del nombre)
  const options = useMemo(() => {
    if (!menu) return []
    const q = norm(menu.q).trim()
    if (!q) return BLOCK_TYPES
    const starts = (txt) => norm(txt).split(/[^a-z0-9]+/).some((w) => w.startsWith(q))
    return BLOCK_TYPES.filter((t) => starts(t.label) || starts(t.hint)).sort((a, b) => Number(starts(b.label)) - Number(starts(a.label)))
  }, [menu?.q])

  // Convierte el bloque vacío donde escribiste «+» o «/» en el tipo elegido
  const pick = (type) => {
    const id = menu.id
    const el = refs.current[id]
    if (el) el.innerHTML = ''
    commit(blocks.map((b) => (b.id === id ? { ...newBlock(type), id } : b)))
    setMenu(null)
    setFocusId(id)
  }

  const numberOf = (i) => { let n = 1; for (let k = i - 1; k >= 0 && blocks[k].type === 'numbered'; k--) n++; return n }

  const onKeyDown = (e, b, i) => {
    if (menu?.id === b.id) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenu({ ...menu, i: (menu.i + 1) % Math.max(options.length, 1) }); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenu({ ...menu, i: (menu.i - 1 + options.length) % Math.max(options.length, 1) }); return }
      if (e.key === 'Enter') { e.preventDefault(); if (options[menu.i]) pick(options[menu.i].type); return }
      if (e.key === 'Escape') { setMenu(null); return }
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(i, e.key === 'ArrowUp' ? -1 : 1); return }
    const el = e.currentTarget
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!strip(el.innerHTML) && LIST.includes(b.type)) { toText(b.id); el.innerHTML = ''; return } // Enter en lista vacía: sale de la lista
      insertAfter(b.id, newBlock(LIST.includes(b.type) ? b.type : 'text'))
    } else if (e.key === 'Backspace' && !strip(el.innerHTML)) {
      e.preventDefault()
      if (b.type !== 'text') toText(b.id)
      else if (blocks.length > 1) remove(b.id)
    } else if (e.key === 'ArrowUp' && i > 0 && window.getSelection()?.anchorOffset === 0) focusBlock(i - 1)
    else if (e.key === 'ArrowDown' && i < blocks.length - 1 && window.getSelection()?.anchorOffset === el.textContent.length) focusBlock(i + 1)
  }
  const focusBlock = (i) => { const b = blocks[i]; if (b && TEXTY.includes(b.type)) refs.current[b.id]?.focus(); else if (b) setFocusId(b.id) }

  const onInput = (e, b) => {
    const el = e.currentTarget
    const text = el.textContent
    const sc = b.type === 'text' && SHORTCUTS.find(([re]) => re.test(text))
    if (sc) { el.innerHTML = ''; setMenu(null); patch(b.id, { type: sc[1], html: '', ...(sc[1] === 'todo' ? { checked: false } : {}) }); return }
    // «+» o «/» al empezar abre el menú de bloques
    if ((text.startsWith('/') || text.startsWith('+')) && TEXTY.includes(b.type)) {
      const r = el.getBoundingClientRect()
      const z = parseFloat(getComputedStyle(el.closest('.d-app') ?? document.body).zoom) || 1 // la vista portátil va con zoom
      setMenu((m) => ({ id: b.id, q: text.slice(1), i: m?.id === b.id && m.q === text.slice(1) ? m.i : 0, x: r.left / z, y: r.bottom / z }))
    } else if (menu?.id === b.id) setMenu(null)
    patch(b.id, { html: sanitize(el.innerHTML) })
  }

  // Pulsar en el hueco de la página: escribe en el último bloque (o crea uno si el último no es de texto)
  const onPageClick = (e) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('blocks-tail')) return
    const last = blocks[blocks.length - 1]
    if (last && TEXTY.includes(last.type)) refs.current[last.id]?.focus()
    else insertAt(blocks.length, newBlock())
  }

  // Texto que llega de fuera (seleccionado en el PDF): se añade al final como un párrafo
  if (appendRef) {
    appendRef.current = (text) => {
      const html = sanitize(String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])))
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'text' && !strip(last.html)) commit(blocks.map((b) => (b.id === last.id ? { ...b, html } : b)))
      else commit([...blocks, newBlock('text', html)])
    }
  }

  const only = blocks.length === 1 && isEmpty(blocks[0])

  return (
    <div className="card blocks">
      <div className="blocks-bar"><span className="doc-status" role="status">Se guarda solo</span>{exportAs && <button type="button" className="pill pill-sm" onClick={() => setExporting(true)} title="Exportar a PDF"><Icon name="pdf" size={14} /> PDF</button>}{bar}</div>
      {exporting && <ExportDialog title={exportAs.title} subtitle={exportAs.subtitle} blocks={blocks} onClose={() => setExporting(false)} />}
      <div ref={pageRef} className="blocks-page" role="group" aria-label={label} onClick={onPageClick}>
        {blocks.map((b, i) => (
          <div key={b.id} className={`block-slot slot-${b.type} ${drag?.id === b.id ? 'is-dragging' : ''} ${drag?.over === b.id && drag.id !== b.id ? (drag.after ? 'drop-after' : 'drop-before') : ''}`}
            onDragOver={(e) => { if (!drag) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2; if (drag.over !== b.id || drag.after !== after) setDrag({ ...drag, over: b.id, after }) }}
            onDrop={(e) => { e.preventDefault(); dropDrag() }}>
            <Gap />
            <span className="row-tools">
              <button type="button" className="row-plus" onClick={(e) => { e.stopPropagation(); insertAfter(b.id, newBlock()) }} aria-label="Añadir un bloque de texto debajo" title="Añadir un bloque debajo"><Icon name="plus" size={16} strokeWidth={2.6} /></button>
              <button type="button" className="row-grip" draggable aria-label="Mover o abrir opciones del bloque" title="Arrastra para mover · pulsa para opciones"
                onClick={(e) => { e.stopPropagation(); setRowMenu(rowMenu === b.id ? null : b.id) }}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); const slot = e.currentTarget.closest('.block-slot'); if (slot) e.dataTransfer.setDragImage(slot, 0, 0); setRowMenu(null); setDrag({ id: b.id, over: null, after: false }) }}
                onDragEnd={() => setDrag(null)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">{[3, 7, 11].flatMap((y) => [4.5, 9.5].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" />))}</svg>
              </button>
              {rowMenu === b.id && (
                <>
                  <span className="row-backdrop" onClick={(e) => { e.stopPropagation(); setRowMenu(null) }} />
                  <span className="card row-menu" role="menu">
                    {b.type !== 'image' && <button role="menuitem" onClick={() => duplicate(b.id)}><Icon name="note" size={16} />Duplicar</button>}
                    <button role="menuitem" onClick={() => { setRowMenu(null); remove(b.id) }}><Icon name="trash" size={16} />Eliminar</button>
                  </span>
                </>
              )}
            </span>
            <div className={`block block-${b.type}`}>
              <div className={`block-body bt-${b.type}`}>
                {b.type === 'bullet' && <span className="block-mark" aria-hidden="true">•</span>}
                {b.type === 'numbered' && <span className="block-mark" aria-hidden="true">{numberOf(i)}.</span>}
                {b.type === 'todo' && <input type="checkbox" className="block-check" checked={!!b.checked} onChange={() => patch(b.id, { checked: !b.checked })} aria-label="Hecha" />}
                {b.type === 'divider' && <hr className="block-divider" tabIndex={0} onKeyDown={(e) => (e.key === 'Backspace' || e.key === 'Delete') && remove(b.id)} />}
                {b.type === 'code' && <CodeBlock block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} focus={focusId === b.id} onFocused={() => setFocusId(null)} onEmptyBackspace={() => remove(b.id)} />}
                {b.type === 'table' && <TableBlock block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} focus={focusId === b.id} onFocused={() => setFocusId(null)} />}
                {b.type === 'image' && <ImageBlock block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} />}
                {TEXTY.includes(b.type) && (
                  <Line block={b} refCb={(el) => { if (el) refs.current[b.id] = el }} focus={focusId === b.id} done={() => setFocusId(null)}
                    onInput={(e) => onInput(e, b)} onKeyDown={(e) => onKeyDown(e, b, i)}
                    placeholder={only ? 'Escribe aquí o pulsa + o «/» para elegir un bloque' : ''} />
                )}
              </div>
            </div>
          </div>
        ))}
        <Gap last />
        <div className="blocks-tail" aria-hidden="true" />
      </div>
      {menu && (
        <div className="card slash-menu" role="listbox" aria-label="Tipo de bloque" style={{ left: menu.x, top: menu.y + 6 }}>
          {options.map((t, k) => (
            <button key={t.type} role="option" aria-selected={k === menu.i} className={k === menu.i ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(t.type) }}><Icon name={t.icon} size={18} />{t.label}</button>
          ))}
          {options.length === 0 && <span className="muted slash-empty">Sin resultados</span>}
        </div>
      )}
    </div>
  )
}

/** Hueco entre bloques (solo espacio; el + sale a la izquierda del bloque al pasar el ratón). */
function Gap({ last = false }) {
  return <div className={`block-gap ${last ? 'is-last' : ''}`} aria-hidden="true" />
}

/** Una línea editable. Solo se vuelve a escribir su contenido cuando cambia desde fuera (no mientras tecleas). */
function Line({ block, refCb, focus, done, onInput, onKeyDown, placeholder }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current && ref.current.innerHTML !== block.html) ref.current.innerHTML = block.html }, [block.html, block.type])
  useEffect(() => {
    if (!focus || !ref.current) return
    ref.current.focus()
    const r = document.createRange(); r.selectNodeContents(ref.current); r.collapse(false)
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r)
    done()
  }, [focus])
  return (
    <div ref={(el) => { ref.current = el; refCb(el) }} className={`block-text ${block.type === 'todo' && block.checked ? 'is-done' : ''} ${placeholder ? 'is-only' : ''}`} contentEditable suppressContentEditableWarning
      role="textbox" aria-multiline="true" data-placeholder={placeholder || (block.type === 'text' ? '' : BLOCK_TYPES.find((t) => t.type === block.type)?.label)}
      onInput={onInput} onKeyDown={onKeyDown} spellCheck />
  )
}
