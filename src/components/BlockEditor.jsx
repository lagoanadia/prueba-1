import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { BLOCK_TYPES, newBlock, toBlocks, toDoc } from '../lib/docModel.js'
import { sanitize } from '../lib/richText.js'

// Atajos de escritura: «# » título, «- » puntos, «1. » numerada, «[] » tareas, «> » cita
const SHORTCUTS = [[/^#\s$/, 'h1'], [/^##\s$/, 'h2'], [/^###\s$/, 'h3'], [/^[-*]\s$/, 'bullet'], [/^1\.\s$/, 'numbered'], [/^\[\]\s$/, 'todo'], [/^>\s$/, 'quote']]
const strip = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

/**
 * Editor de documentos por bloques (estilo Notion): escribe «/» para elegir el tipo de bloque,
 * arrastra el asa para reordenar, Enter crea otro bloque y Ctrl+B / I / U da formato.
 * `value` = lo guardado (cualquier formato); `onChange(doc)` guarda. Cambia la `key` para abrir otro documento.
 */
export default function BlockEditor({ value, onChange, label = 'Documento' }) {
  const [blocks, setBlocks] = useState(() => toBlocks(value))
  const [focusId, setFocusId] = useState(null)
  const [menu, setMenu] = useState(null) // { id, q, i, x, y }
  const [handle, setHandle] = useState(null) // id del bloque con el menú del asa abierto
  const [dragId, setDragId] = useState(null)
  const refs = useRef({})

  const commit = (next) => { setBlocks(next); onChange(toDoc(next)) }
  const patch = (id, p) => commit(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)))
  const indexOf = (id) => blocks.findIndex((b) => b.id === id)
  const insertAfter = (id, b) => { const i = indexOf(id); const n = [...blocks]; n.splice(i + 1, 0, b); commit(n); setFocusId(b.id) }
  const remove = (id) => { const i = indexOf(id); const n = blocks.filter((b) => b.id !== id); commit(n.length ? n : [newBlock()]); setFocusId((n[i - 1] ?? n[0])?.id ?? null) }
  const convert = (id, type) => { patch(id, { type, ...(type === 'todo' ? { checked: false } : {}) }); setFocusId(id) }

  const options = useMemo(() => (menu ? BLOCK_TYPES.filter((t) => `${t.label} ${t.hint}`.toLowerCase().includes(menu.q.toLowerCase())) : []), [menu?.q])

  const pick = (type) => {
    const id = menu.id
    const el = refs.current[id]
    if (el) el.innerHTML = ''
    patch(id, { type, html: '', ...(type === 'todo' ? { checked: false } : {}) })
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
    const el = e.currentTarget
    if (e.key === 'Enter' && !e.shiftKey && b.type !== 'code') {
      e.preventDefault()
      const empty = !strip(el.innerHTML)
      if (empty && ['bullet', 'numbered', 'todo'].includes(b.type)) { convert(b.id, 'text'); el.innerHTML = ''; return } // Enter en lista vacía: sale de la lista
      insertAfter(b.id, newBlock(['bullet', 'numbered', 'todo'].includes(b.type) ? b.type : 'text'))
    } else if (e.key === 'Backspace' && !strip(el.innerHTML)) {
      e.preventDefault()
      if (b.type !== 'text') convert(b.id, 'text')
      else if (blocks.length > 1) remove(b.id)
    } else if (e.key === 'ArrowUp' && i > 0 && window.getSelection()?.anchorOffset === 0) { refs.current[blocks[i - 1].id]?.focus() }
    else if (e.key === 'ArrowDown' && i < blocks.length - 1 && window.getSelection()?.anchorOffset === el.textContent.length) { refs.current[blocks[i + 1].id]?.focus() }
  }

  const onInput = (e, b) => {
    const el = e.currentTarget
    const text = el.textContent
    // atajos de markdown al principio de un bloque de texto
    const sc = b.type === 'text' && SHORTCUTS.find(([re]) => re.test(text))
    if (sc) { el.innerHTML = ''; setMenu(null); patch(b.id, { type: sc[1], html: '', ...(sc[1] === 'todo' ? { checked: false } : {}) }); return }
    // «/» abre el menú de bloques
    if (text.startsWith('/') && b.type !== 'code') {
      const r = el.getBoundingClientRect()
      const z = parseFloat(getComputedStyle(el.closest('.d-app') ?? document.body).zoom) || 1 // la vista portátil va con zoom
      setMenu((m) => ({ id: b.id, q: text.slice(1), i: m?.id === b.id ? Math.min(m.i, 9) : 0, x: r.left / z, y: r.bottom / z }))
    } else if (menu?.id === b.id) setMenu(null)
    patch(b.id, { html: sanitize(el.innerHTML) })
  }

  const drop = (toId) => {
    if (!dragId || dragId === toId) return
    const from = indexOf(dragId); const to = indexOf(toId)
    const n = [...blocks]; const [m] = n.splice(from, 1); n.splice(to, 0, m)
    commit(n)
    setDragId(null)
  }

  return (
    <div className="card blocks" onClick={(e) => { if (e.target === e.currentTarget) { const last = blocks[blocks.length - 1]; refs.current[last.id]?.focus() } }}>
      <div className="blocks-bar"><span className="muted">Escribe «/» para insertar un bloque</span><span className="doc-status" role="status">Se guarda solo</span></div>
      <div className="blocks-page" role="group" aria-label={label}>
        {blocks.map((b, i) => (
          <div key={b.id} className={`block ${dragId === b.id ? 'is-drag' : ''}`} onDragOver={(e) => dragId && e.preventDefault()} onDrop={() => drop(b.id)}>
            <span className="block-side">
              <button className="block-btn" onClick={() => insertAfter(b.id, newBlock())} aria-label="Añadir bloque debajo" title="Añadir bloque"><Icon name="plus" size={16} /></button>
              <button className="block-btn block-grip" draggable onDragStart={(e) => { setDragId(b.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setDragId(null)}
                onClick={() => setHandle(handle === b.id ? null : b.id)} aria-label="Mover o cambiar bloque" title="Arrastra para mover · pulsa para opciones"
                onKeyDown={(e) => { if (e.altKey && e.key === 'ArrowUp' && i > 0) { e.preventDefault(); const n = [...blocks]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; commit(n) } if (e.altKey && e.key === 'ArrowDown' && i < blocks.length - 1) { e.preventDefault(); const n = [...blocks]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; commit(n) } }}>
                <Icon name="grip" size={16} />
              </button>
              {handle === b.id && (
                <div className="card block-menu" role="menu">
                  {BLOCK_TYPES.slice(0, 7).map((t) => <button key={t.type} role="menuitem" onClick={() => { convert(b.id, t.type); setHandle(null) }}><Icon name={t.icon} size={16} />{t.label}</button>)}
                  <button role="menuitem" onClick={() => { insertAfter(b.id, { ...b, id: crypto.randomUUID() }); setHandle(null) }}><Icon name="note" size={16} />Duplicar</button>
                  <button role="menuitem" onClick={() => { remove(b.id); setHandle(null) }}><Icon name="trash" size={16} />Eliminar</button>
                </div>
              )}
            </span>
            <div className={`block-body bt-${b.type}`}>
              {b.type === 'bullet' && <span className="block-mark" aria-hidden="true">•</span>}
              {b.type === 'numbered' && <span className="block-mark" aria-hidden="true">{numberOf(i)}.</span>}
              {b.type === 'todo' && <input type="checkbox" className="block-check" checked={!!b.checked} onChange={() => patch(b.id, { checked: !b.checked })} aria-label="Hecha" />}
              {b.type === 'divider'
                ? <hr className="block-divider" tabIndex={0} onKeyDown={(e) => (e.key === 'Backspace' || e.key === 'Delete') && remove(b.id)} />
                : (
                  <Line block={b} refCb={(el) => { if (el) refs.current[b.id] = el }} focus={focusId === b.id} done={() => setFocusId(null)}
                    onInput={(e) => onInput(e, b)} onKeyDown={(e) => onKeyDown(e, b, i)} placeholder={i === 0 && blocks.length === 1 ? "Escribe «/» para ver los bloques" : ''} />
                )}
            </div>
          </div>
        ))}
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
    <div ref={(el) => { ref.current = el; refCb(el) }} className={`block-text ${block.type === 'todo' && block.checked ? 'is-done' : ''}`} contentEditable suppressContentEditableWarning
      role="textbox" aria-multiline="true" data-placeholder={placeholder || (block.type === 'text' ? '' : BLOCK_TYPES.find((t) => t.type === block.type)?.label)}
      onInput={onInput} onKeyDown={onKeyDown} spellCheck />
  )
}
