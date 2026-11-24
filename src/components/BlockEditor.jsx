import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Icon from './Icon.jsx'
import ExportDialog from './ExportDialog.jsx'
import CodeBlock from './blocks/CodeBlock.jsx'
import ImageBlock from './blocks/ImageBlock.jsx'
import GalleryBlock from './blocks/GalleryBlock.jsx'
import LinkBlock from './blocks/LinkBlock.jsx'
import TableBlock from './blocks/TableBlock.jsx'
import { BLOCK_TYPES, POSTIT_COLORS, newBlock, toBlocks, toDoc, numberAt } from '../lib/docModel.js'
import { sanitize } from '../lib/richText.js'
import { blocksFromPaste } from '../lib/pasteBlocks.js'
import { saveFile } from '../lib/fileStore.js'
import { syncCodeColor } from '../lib/exportNotes.js'

// Atajos de escritura: «# » título, «- » puntos, «1. » numerada, «[] » tareas, «> » cita
const SHORTCUTS = [[/^#\s$/, 'h1'], [/^##\s$/, 'h2'], [/^###\s$/, 'h3'], [/^####\s$/, 'h4'], [/^[-*]\s$/, 'bullet'], [/^1\.\s$/, 'numbered'], [/^\[\]\s$/, 'todo'], [/^>\s$/, 'quote']]
// Sin tildes ni mayúsculas, para que «tit» encuentre «Título»
const norm = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
/** Tipos de bloque cuya palabra empieza por lo escrito (primero los que coinciden con el nombre) */
const filterTypes = (text) => {
  const q = norm(text).trim()
  if (!q) return BLOCK_TYPES
  const starts = (txt) => norm(txt).split(/[^a-z0-9]+/).some((w) => w.startsWith(q))
  return BLOCK_TYPES.filter((t) => starts(t.label) || starts(t.hint)).sort((a, b) => Number(starts(b.label)) - Number(starts(a.label)))
}
const strip = (html) => (html ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
const cleanPasted = (list) => list.map((b) => ({ ...b, ...(typeof b.html === 'string' && /background/i.test(b.html) ? { html: sanitize(b.html) } : {}), ...(Array.isArray(b.blocks) ? { blocks: cleanPasted(b.blocks) } : {}) }))
const IMG = ['image', 'gallery']
// Copiar bloques con su formato: lo que va al portapapeles lleva los bloques tal cual (para pegarlos en otro sitio del documento sin que cambie nada)
const escHtml = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const htmlOfBlocks = (list) => {
  let out = ''
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    if (['bullet', 'numbered', 'todo'].includes(b.type)) {
      const tag = b.type === 'numbered' ? 'ol' : 'ul'
      let items = ''
      while (i < list.length && (list[i].type === b.type || (b.type !== 'numbered' && ['bullet', 'todo'].includes(list[i].type)))) { items += `<li>${list[i].html ?? ''}</li>`; i++ }
      i--
      out += `<${tag}>${items}</${tag}>`
    } else if (/^h[123]$/.test(b.type)) out += `<div><b>${b.html ?? ''}</b></div>`
    else if (b.type === 'code') out += `<div><code>${escHtml(b.code).replace(/\n/g, '<br>')}</code></div>`
    else if (b.type === 'table') out += (b.rows ?? []).map((r) => `<div>${r.map((c) => (b.rich ? c : escHtml(c))).join(' · ')}</div>`).join('')
    else if (b.type === 'box') out += htmlOfBlocks(b.blocks ?? [])
    else if (['divider', 'image', 'gallery', 'link'].includes(b.type)) out += b.type === 'link' ? `<div>${escHtml(b.title || b.url)}</div>` : ''
    else out += `<div>${b.html ?? ''}</div>`
  }
  return out
}
const freshIds = (list) => list.map((x) => ({ ...x, id: crypto.randomUUID(), ...(Array.isArray(x.blocks) ? { blocks: freshIds(x.blocks) } : {}) }))
const writeClip = async (payload, plain) => {
  const keep = payload.filter((b) => !['image', 'gallery'].includes(b.type)) // las fotos no se copian (comparten archivo)
  const html = `<div data-pblocks="${encodeURIComponent(JSON.stringify(keep))}">${htmlOfBlocks(keep)}</div>`
  try {
    if (navigator.clipboard?.write && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([plain], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })])
    else await navigator.clipboard?.writeText(plain)
  } catch { try { await navigator.clipboard?.writeText(plain) } catch { /* sin permiso */ } }
}
const TEXTY = ['text', 'h1', 'h2', 'h3', 'h4', 'bullet', 'numbered', 'todo', 'quote', 'callout']
const LIST = ['bullet', 'numbered', 'todo']
const isEmpty = (b) => (b.type === 'box' ? (b.blocks ?? []).every(isEmpty) : TEXTY.includes(b.type) ? !strip(b.html) : b.type === 'code' ? !b.code : b.type === 'link' ? !b.url : b.type === 'image' ? !b.file : b.type === 'gallery' ? !(b.files ?? []).length : false)

/** Rango del DOM entre dos posiciones de texto (en caracteres) dentro de `root`; `to` puede ser Infinity (hasta el final) */
function domRangeFor(root, from, to) {
  const r = document.createRange()
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  r.setStart(root, root.childNodes.length); r.setEnd(root, root.childNodes.length)
  let n; let pos = 0; let started = false
  while ((n = w.nextNode())) {
    const end = pos + n.length
    if (!started && from <= end) { r.setStart(n, Math.max(0, from - pos)); started = true }
    if (started && to <= end) { r.setEnd(n, Math.max(0, to - pos)); return r }
    pos = end
  }
  return r
}
/** HTML de lo que hay entre dos posiciones de texto de un bloque */
function sliceHtml(html, from, to) {
  const d = document.createElement('div'); d.innerHTML = html
  const o = document.createElement('div'); o.appendChild(domRangeFor(d, from, to).cloneContents())
  return o.innerHTML
}
// Ctrl+Z / Ctrl+Y aunque no haya nada enfocado (por ejemplo, justo después de subrayar o de convertir un bloque)
let ACTIVE_EDITOR = null
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || !ACTIVE_EDITOR) return
    const k = e.key.toLowerCase()
    if (k !== 'z' && k !== 'y') return
    if (e.target.closest?.('input, textarea, select, [contenteditable=true]')) return // si hay un campo enfocado, lo gestiona él
    ACTIVE_EDITOR(e)
  })
}
// Estado del subrayador compartido por todos los editores (también los de dentro de un Post-it)
const penStore = { s: { on: false, color: 'amarillo' }, subs: new Set() }
const setPenStore = (p) => { penStore.s = typeof p === 'function' ? p(penStore.s) : p; penStore.subs.forEach((f) => f()) }
const usePen = () => useSyncExternalStore((f) => { penStore.subs.add(f); return () => penStore.subs.delete(f) }, () => penStore.s)
const isWordChar = (c) => /[\p{L}\p{N}_]/u.test(c ?? '')
/** Si el principio o el final caen a mitad de una palabra, se amplía a la palabra entera */
function snapWord(text, from, to) {
  while (from > 0 && isWordChar(text[from - 1]) && isWordChar(text[from])) from -= 1
  while (to < text.length && isWordChar(text[to]) && isWordChar(text[to - 1])) to += 1
  return [from, to]
}
/** Quita los espacios del principio y del final de lo marcado (no se subraya el aire ni «la nada») */
function trimSpaces(text, from, to) {
  while (from < to && /\s/.test(text[from])) from += 1
  while (to > from && /\s/.test(text[to - 1])) to -= 1
  return [from, to]
}
/**
 * Subrayador: pone el color a lo que hay entre dos posiciones de texto (o lo quita con 'none'). Si ya estaba subrayado solo cambia
 * el color (nunca se subraya encima de otro subrayado). `root` puede ser un trozo de HTML suelto.
 */
function wrapHl(root, from, to, color) {
  if (to <= from) return
  // 1) cada trozo de texto con su color actual
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const items = []
  let pos = 0
  let n
  while ((n = walker.nextNode())) {
    const sp = n.parentElement?.closest('span[data-hl]')
    items.push({ n, start: pos, end: pos + n.length, c: sp && root.contains(sp) ? sp.getAttribute('data-hl') : null })
    pos += n.length
  }
  // 2) se quitan todos los subrayados y se vuelven a poner después con el color final de cada trozo
  root.querySelectorAll('span[data-hl]').forEach((sp) => sp.replaceWith(...sp.childNodes))
  const pieces = []
  for (const it of items) {
    if (!it.n.length) continue
    const cuts = [it.start, ...[from, to].filter((x) => x > it.start && x < it.end), it.end]
    let node = it.n
    for (let k = 1; k < cuts.length; k++) {
      const last = k === cuts.length - 1
      const rest = last ? null : node.splitText(cuts[k] - cuts[k - 1])
      const inside = cuts[k - 1] >= from && cuts[k] <= to
      pieces.push({ node, c: inside ? (color === 'none' ? null : color) : it.c })
      node = rest
    }
  }
  pieces.forEach((p) => { if (p.c) { const sp = document.createElement('span'); sp.setAttribute('data-hl', p.c); p.node.replaceWith(sp); sp.appendChild(p.node) } })
  // 3) los trozos seguidos del mismo color se juntan en uno solo
  root.querySelectorAll('span[data-hl]').forEach((sp) => {
    let nx = sp.nextSibling
    while (nx && nx.nodeType === 1 && nx.tagName === 'SPAN' && nx.getAttribute('data-hl') === sp.getAttribute('data-hl')) {
      while (nx.firstChild) sp.appendChild(nx.firstChild)
      const t = nx
      nx = nx.nextSibling
      t.remove()
    }
  })
  root.normalize()
}
const offsetIn = (el, node, off) => { const r = document.createRange(); r.selectNodeContents(el); r.setEnd(node, off); return r.toString().length }

// Bloque que se está arrastrando por su asa: así se puede soltar en otro editor (por ejemplo, dentro de un Post-it)
let DRAGGING = null
const plainHtml = (h) => String(h ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
/** Texto plano de un bloque (para copiar) */
const plainOf = (b) => (b.type === 'box' ? (b.blocks ?? []).map(plainOf).join('\n') : b.type === 'table' ? (b.rows ?? []).map((r) => r.map((c) => (b.rich ? plainHtml(c) : c)).join('\t')).join('\n') : b.type === 'code' ? b.code ?? '' : b.type === 'link' ? b.url ?? '' : plainHtml(b.html))

/** Baldosa de un tipo de bloque: icono de color grande + nombre (menú de bloques en cuadrícula) */
function Tile({ t }) {
  return (
    <>
      <span className="tile-ic" style={{ background: t.tint, color: t.ink }}>{t.glyph ? <b>{t.glyph}</b> : <Icon name={t.icon} size={22} color={t.ink} />}</span>
      <span className="tile-nm">{t.label}</span>
    </>
  )
}

/**
 * Editor de documentos por bloques (estilo Notion).
 *  - Al pasar el ratón por el hueco entre bloques sale un «+» que crea una caja de texto ahí.
 *  - Escribe «+» o «/» al empezar un bloque y se despliegan los tipos (lista, tabla, foto, código…).
 *  - Enter crea otro bloque; Ctrl+B / I / U da formato; Alt+↑/↓ mueve el bloque.
 *  - Pulsar en cualquier parte de la página escribe al final.
 * `value` = lo guardado; `onChange(doc)` guarda; `bar` = botones extra para la barra (p. ej. Compartir).
 * Cambia la `key` para abrir otro documento.
 */
export default function BlockEditor({ value, onChange, label = 'Documento', bar = null, appendRef = null, exportAs = null, nested = false, onExit = null, onSplit = null, scrollToId = null }) {
  // Al abrir, se quitan los fondos blancos que se colaron al pegar de otras páginas (los subrayados propios no se tocan)
  const [blocks, setBlocks] = useState(() => cleanPasted(toBlocks(value)))
  const [focusId, setFocusId] = useState(null)
  const lastId = useRef(null) // último bloque donde tuviste el cursor
  const [menu, setMenu] = useState(null) // { id, q, i, x, y }
  const [exporting, setExporting] = useState(false)
  const [drag, setDrag] = useState(null) // { id, over, after } al arrastrar un bloque por su asa
  const [rowMenu, setRowMenu] = useState(null) // id del bloque con el menú del asa abierto
  const [rowQ, setRowQ] = useState('') // lo escrito en el menú del asa para buscar un tipo
  const [rowI, setRowI] = useState(0)
  const [rowUp, setRowUp] = useState(false) // el menú se abre hacia arriba si el asa está en la parte baja
  const refs = useRef({})
  const [sel, setSel] = useState([]) // ids de los bloques marcados (arrastrando por varios o con Mayús + clic)
  const [picking, setPicking] = useState(false)
  const pen = usePen() // subrayador: modo rotulador y color elegido
  const setPen = setPenStore
  const [range, setRange] = useState(null) // selección de texto entre bloques: { a: { id, off }, b: { id, off } }
  const dragSel = useRef(null)
  const suppressClick = useRef(false)
  const live = useRef({})
  const pageRef = useRef(null)

  const blocksRef = useRef(blocks) // siempre al día, aunque haya varios cambios seguidos (mover entre editores)
  const me = useRef({}).current
  // Deshacer / rehacer (Ctrl+Z, Ctrl+Mayús+Z o Ctrl+Y) de todo el documento; lo que se escribe seguido se agrupa en un solo paso
  const hist = useRef({ past: [], future: [], t: 0 })
  const typingRef = useRef(false) // verdadero mientras se teclea: lo que se escribe seguido es un solo paso de Ctrl+Z; todo lo demás (convertir, subrayar, mover…) es un paso propio
  const markTyping = () => { typingRef.current = true; setTimeout(() => { typingRef.current = false }, 0) }
  const [saving, setSaving] = useState(false) // «Guardando…» en gris claro mientras haces cambios
  const saveTimer = useRef(null)
  const flagSaving = () => { setSaving(true); clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => setSaving(false), 1400) }
  useEffect(() => { try { const c = JSON.parse(localStorage.getItem('exportStyle') || '{}').color; if (c) syncCodeColor(c) } catch { /* sin guardado */ } }, [])
  const [rev, setRev] = useState(0) // sube al deshacer: los Post-it de dentro se vuelven a cargar
  const commit = (next) => {
    if (!nested) {
      const h = hist.current; const now = Date.now()
      const typing = typingRef.current; typingRef.current = false
      if (!h.past.length || !typing || now - h.t > 600) { h.past.push(blocksRef.current); if (h.past.length > 150) h.past.shift() }
      h.t = now; h.future = []
    }
    blocksRef.current = next; setBlocks(next); onChange(toDoc(next))
    flagSaving()
  }
  const travel = (from, to) => {
    const h = hist.current
    if (!h[from].length) return
    h[to].push(blocksRef.current)
    const target = h[from].pop()
    h.t = 0
    blocksRef.current = target; setBlocks(target); onChange(toDoc(target)); flagSaving(); setRev((r) => r + 1); setSel([]); setMenu(null)
    const keep = target.find((b) => b.id === lastId.current)
    if (keep && TEXTY.includes(keep.type)) setFocusId(keep.id)
  }
  const onUndoKey = (e) => {
    if (nested || !(e.ctrlKey || e.metaKey) || e.altKey) return
    const k = e.key.toLowerCase()
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); travel('past', 'future') }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); e.stopPropagation(); travel('future', 'past') }
  }
  const undoRun = useRef(null)
  undoRun.current = onUndoKey
  useEffect(() => {
    if (nested) return undefined
    const me = (e) => undoRun.current(e)
    ACTIVE_EDITOR = me
    return () => { if (ACTIVE_EDITOR === me) ACTIVE_EDITOR = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const patch = (id, p) => commit(blocksRef.current.map((b) => (b.id === id ? { ...b, ...p } : b)))
  const indexOf = (id) => blocks.findIndex((b) => b.id === id)
  const insertAt = (index, b) => { const n = [...blocks]; n.splice(index, 0, b); commit(n); setFocusId(b.id) }
  const insertAfter = (id, b) => insertAt(indexOf(id) + 1, b)
  // Dividir un Post-it en dos (del mismo color): lo que va desde el bloque elegido pasa a un Post-it nuevo justo debajo
  const splitBox = (boxId, childId) => {
    const box = blocksRef.current.find((x) => x.id === boxId)
    const k = (box?.blocks ?? []).findIndex((x) => x.id === childId)
    if (!box || k < 1) return
    hist.current.t = 0
    const second = { ...newBlock('box'), color: box.color, blocks: box.blocks.slice(k) }
    commit(blocksRef.current.flatMap((x) => (x.id === boxId ? [{ ...x, blocks: box.blocks.slice(0, k) }, second] : [x])))
    setRev((r) => r + 1) // el Post-it de arriba se vuelve a pintar con lo que le queda
  }
  const remove = (id) => { const i = indexOf(id); const n = blocks.filter((b) => b.id !== id); commit(n.length ? n : [newBlock()]); setFocusId((n[i - 1] ?? n[0])?.id ?? null) }
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; commit(n) }
  const dropDrag = () => {
    if (drag?.foreign) { // viene de otro editor (p. ej. de fuera a dentro de un Post-it, o al revés)
      const D = DRAGGING; DRAGGING = null
      if (D) {
        const base = blocksRef.current
        const found = base.findIndex((b) => b.id === drag.over)
        const at = found < 0 ? base.length : found + (drag.after ? 1 : 0)
        const empty = base.length === 1 && isEmpty(base[0])
        commit(empty ? [D.block] : [...base.slice(0, at), D.block, ...base.slice(at)])
        D.detach(); D.finish()
      }
      setDrag(null)
      return
    }
    if (!drag?.over || drag.over === drag.id) { setDrag(null); return }
    // Una foto soltada ENCIMA de otra (en el centro) se junta con ella en una galería
    if (drag.merge) {
      const moving = blocks.find((b) => b.id === drag.id)
      const target = blocks.find((b) => b.id === drag.over)
      const filesOf = (b) => (b.type === 'gallery' ? b.files ?? [] : b.file ? [b.file] : [])
      if (moving && target && IMG.includes(moving.type) && IMG.includes(target.type)) {
        const files = [...filesOf(target), ...filesOf(moving)]
        const gallery = target.type === 'gallery' ? { ...target, files } : { ...newBlock('gallery'), id: target.id, files, layout: 'row' }
        hist.current.t = 0
        commit(blocks.filter((b) => b.id !== moving.id).map((b) => (b.id === target.id ? gallery : b)))
        setDrag(null)
        return
      }
    }
    const item = blocks.find((b) => b.id === drag.id)
    const rest = blocks.filter((b) => b.id !== drag.id)
    const at = rest.findIndex((b) => b.id === drag.over) + (drag.after ? 1 : 0)
    rest.splice(at, 0, item)
    commit(rest)
    setDrag(null)
  }
  // Arrastrando se puede soltar en cualquier punto de la página: se elige el bloque más cercano y se desplaza sola al llegar al borde
  const dragOverPage = (e) => {
    const foreign = Boolean(DRAGGING && DRAGGING.owner !== me)
    if (!drag && !foreign) return
    if (foreign) {
      const blk = DRAGGING.block
      if (nested && blk.type === 'box') return // un Post-it no entra en otro
      if (pageRef.current.closest(`.block-slot[data-id="${blk.id}"]`)) return // ni dentro de sí mismo
      e.stopPropagation(); DRAGGING.resetOver()
    }
    e.preventDefault()
    const page = pageRef.current
    const slots = [...page.children].filter((c) => c.classList?.contains('block-slot'))
    if (!slots.length) return
    const y = e.clientY
    let hit = slots.find((el) => { const r = el.getBoundingClientRect(); return y >= r.top && y <= r.bottom })
    if (!hit) hit = y < slots[0].getBoundingClientRect().top ? slots[0] : slots[slots.length - 1]
    const r = hit.getBoundingClientRect()
    const over = hit.dataset.id
    const after = y > r.top + r.height / 2
    // Arrastrando una foto sobre el centro de otra foto: se juntarán en una galería
    const moving = !foreign && blocksRef.current.find((b) => b.id === drag?.id)
    const target = !foreign && blocksRef.current.find((b) => b.id === over)
    const merge = Boolean(moving && target && moving.id !== target.id && IMG.includes(moving.type) && IMG.includes(target.type) && y > r.top + r.height * 0.25 && y < r.bottom - r.height * 0.25)
    if (!drag || drag.over !== over || drag.after !== after || Boolean(drag.merge) !== merge) setDrag(foreign ? { id: DRAGGING.block.id, foreign: true, over, after } : { ...drag, over, after, merge })
    const pr = page.getBoundingClientRect()
    if (y < pr.top + 50) page.scrollTop -= 14
    else if (y > pr.bottom - 50) page.scrollTop += 14
  }
  // Cambiar el tipo de un bloque conservando su texto (texto, títulos, listas, tareas, cita, destacado, código)
  const CONVERTIBLE = ['text', 'h1', 'h2', 'h3', 'h4', 'bullet', 'numbered', 'todo', 'quote', 'callout', 'code']
  const toPlain = (b) => (b.type === 'code' ? b.code ?? '' : (b.html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
  const convert = (id, type) => {
    const cur = blocks.find((b) => b.id === id)
    if (!cur || cur.type === type) { setRowMenu(null); return }
    if (type === 'box' && cur.type !== 'box') { // el bloque entra dentro de un recuadro
      commit(blocks.map((b) => (b.id === id ? { ...newBlock('box'), blocks: [b] } : b)))
      setRowMenu(null)
      return
    }
    if (CONVERTIBLE.includes(cur.type) && CONVERTIBLE.includes(type)) {
      // texto ↔ títulos, listas, tareas, cita, destacado y código: el texto se conserva
      commit(blocks.map((b) => {
        if (b.id !== id) return b
        const html = b.type === 'code' ? sanitize((b.code ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')) : b.html ?? ''
        if (type === 'code') return { ...newBlock('code'), id, code: toPlain(b) }
        return { id, type, html, ...(type === 'todo' ? { checked: false } : {}) }
      }))
      setFocusId(id)
    } else {
      // tabla, foto, enlace, divisor…: ocupan el sitio si el bloque está vacío; si no, se añaden debajo sin perder lo que hay
      const nb = newBlock(type)
      if (isEmpty(cur)) commit(blocks.map((b) => (b.id === id ? { ...nb, id } : b)))
      else { const n = [...blocks]; n.splice(indexOf(id) + 1, 0, nb); commit(n) }
      setFocusId(isEmpty(cur) ? id : nb.id)
    }
    setRowMenu(null)
  }
  const duplicate = (id) => { const i = indexOf(id); const b = blocks[i]; const n = [...blocks]; n.splice(i + 1, 0, { ...b, id: crypto.randomUUID() }); commit(n); setRowMenu(null) }
  const toText = (id) => commit(blocks.map((b) => (b.id === id ? { id, type: 'text', html: '' } : b)))

  // Al escribir tras «+» o «/» se quedan solo los tipos cuya palabra empieza por lo escrito (primero los del nombre)
  const options = useMemo(() => (menu ? filterTypes(menu.q).filter((t) => !nested || t.type !== 'box') : []), [menu?.q])
  const rowOptions = useMemo(() => filterTypes(rowQ).filter((t) => !nested || t.type !== 'box'), [rowQ])

  // Convierte el bloque vacío donde escribiste «+» o «/» en el tipo elegido
  const pick = (type) => {
    const id = menu.id
    const el = refs.current[id]
    if (el) el.innerHTML = ''
    commit(blocks.map((b) => (b.id === id ? { ...newBlock(type), id } : b)))
    setMenu(null)
    setFocusId(id)
  }

  const numberOf = (i) => numberAt(blocks, i)

  // Posición del cursor dentro de la línea (en caracteres) y colocarlo en otra
  const caretOffset = (el) => { const sel = window.getSelection(); if (!sel?.rangeCount || !sel.isCollapsed) return -1; const r = sel.getRangeAt(0).cloneRange(); r.selectNodeContents(el); r.setEnd(sel.anchorNode, sel.anchorOffset); return r.toString().length }
  const placeCaret = (id, offset) => setTimeout(() => {
    const el = refs.current[id]; if (!el) return
    el.focus()
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let left = offset; let n
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false)
    while ((n = w.nextNode())) { if (left <= n.length) { r.setStart(n, left); r.collapse(true); break } left -= n.length }
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r)
  }, 30)
  // Une el bloque `b` al final del anterior (Retroceso al principio) o el siguiente al final de `b` (Suprimir al final)
  const join = (keep, drop) => {
    const at = (refs.current[keep.id]?.textContent ?? '').length
    commit(blocks.filter((x) => x.id !== drop.id).map((x) => (x.id === keep.id ? { ...x, html: sanitize(`${refs.current[keep.id]?.innerHTML ?? keep.html}${refs.current[drop.id]?.innerHTML ?? drop.html}`) } : x)))
    placeCaret(keep.id, at)
  }
  // Código dentro de una línea (como la negrita): lo seleccionado se pone con letra de código; si ya lo es, se quita
  const toggleCode = (el, id) => {
    const sel = window.getSelection()
    if (!sel?.rangeCount || !el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return false
    const r = sel.getRangeAt(0)
    const codeOf = (n) => (n.nodeType === 3 ? n.parentElement : n)?.closest('code')
    if (sel.isCollapsed) { // sin nada seleccionado: se entra o se sale del modo código (como con la negrita)
      const inside = codeOf(r.startContainer)
      if (inside) { // salir: el cursor pasa justo detrás del código y lo que escribas ya no lo es
        let after = inside.nextSibling
        if (!after || after.nodeType !== 3) { after = document.createTextNode('\u200B'); inside.after(after) }
        else if (!after.textContent.startsWith('\u200B')) after.textContent = `\u200B${after.textContent}` // un carácter invisible para que el cursor se quede fuera del código
        const nr = document.createRange(); nr.setStart(after, 1); nr.collapse(true)
        sel.removeAllRanges(); sel.addRange(nr)
      } else { // entrar: aparece un código vacío con el cursor dentro
        const c = document.createElement('code'); const t = document.createTextNode('\u200B'); c.appendChild(t)
        r.insertNode(c)
        const nr = document.createRange(); nr.setStart(t, 1); nr.collapse(true)
        sel.removeAllRanges(); sel.addRange(nr)
      }
      hist.current.t = 0
      patch(id, { html: sanitize(el.innerHTML) })
      return true
    }
    const a = codeOf(r.startContainer)
    let made
    if (a && a === codeOf(r.endContainer)) { made = [...a.childNodes]; a.replaceWith(...made) } // ya era código: se quita
    else {
      const frag = r.extractContents()
      frag.querySelectorAll('code').forEach((c) => c.replaceWith(...c.childNodes))
      const c = document.createElement('code'); c.appendChild(frag)
      if (!c.textContent.trim()) { r.insertNode(c); c.replaceWith(...c.childNodes); return true }
      r.insertNode(c); made = [c]
    }
    el.normalize()
    const nr = document.createRange(); nr.selectNodeContents(made[0].nodeType ? made[0] : el); if (made.length > 1) nr.setEndAfter(made[made.length - 1])
    sel.removeAllRanges(); sel.addRange(nr)
    hist.current.t = 0
    patch(id, { html: sanitize(el.innerHTML) })
    return true
  }
  const onKeyDown = (e, b, i) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e' && (TEXTY.includes(b.type) || b.type === 'callout')) { if (toggleCode(e.currentTarget, b.id)) e.preventDefault(); return }
    if (menu?.id === b.id) {
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key]
      if (step) { e.preventDefault(); setMenu({ ...menu, i: Math.max(0, Math.min(options.length - 1, menu.i + step)) }); return }
      if (e.key === 'Enter') { e.preventDefault(); if (options[menu.i]) pick(options[menu.i].type); return }
      if (e.key === 'Escape') { setMenu(null); return }
    }
    if (e.key === 'Escape' && TEXTY.includes(b.type)) { e.preventDefault(); e.currentTarget.blur(); e.nativeEvent.__picked = true; setSel([b.id]); return } // Esc: marca este bloque entero (luego Retroceso lo borra)
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(i, e.key === 'ArrowUp' ? -1 : 1); return }
    const el = e.currentTarget
    if (e.key === 'Enter' && !e.shiftKey && b.type === 'callout') { // dentro de una lista de un Destacado, Enter sigue la lista (y con una viñeta vacía sale de ella)
      const an = window.getSelection()?.anchorNode
      if ((an?.nodeType === 3 ? an.parentElement : an)?.closest?.('li') && el.contains(an)) return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (nested && onExit && !strip(el.innerHTML) && b.type === 'text' && i === blocks.length - 1 && blocks.length > 1) { remove(b.id); onExit(); return } // Enter en la última línea vacía: sale del post-it
      if (!strip(el.innerHTML) && LIST.includes(b.type)) { toText(b.id); el.innerHTML = ''; return } // Enter en lista vacía: sale de la lista
      // Enter con el cursor en medio: lo que queda a la derecha pasa a un bloque nuevo debajo
      const sel = window.getSelection()
      if (sel?.rangeCount && el.contains(sel.anchorNode) && caretOffset(el) < el.textContent.length) {
        const r = sel.getRangeAt(0)
        if (!sel.isCollapsed) r.deleteContents()
        const tail = document.createRange(); tail.setStart(r.endContainer, r.endOffset); tail.setEnd(el, el.childNodes.length)
        const box = document.createElement('div'); box.appendChild(tail.extractContents())
        const nb = { ...newBlock(LIST.includes(b.type) ? b.type : 'text', sanitize(box.innerHTML)), ...(b.collapsed ? { free: true } : {}) }
        const at = blocksRef.current.findIndex((x) => x.id === b.id)
        const n = blocksRef.current.map((x) => (x.id === b.id ? { ...x, html: sanitize(el.innerHTML), } : x))
        n.splice(at + 1 + (b.collapsed ? (foldedCount[b.id] ?? 0) : 0), 0, nb) // si el título está plegado, lo que sobra va fuera de lo plegado
        hist.current.t = 0
        commit(n)
        placeCaret(nb.id, 0)
        return
      }
      if (b.collapsed) { // título plegado: el bloque nuevo entra DESPUÉS de lo plegado, fuera, sin tocar lo de dentro
        const nb = { ...newBlock('text'), free: true }
        const n = [...blocksRef.current]
        n.splice(n.findIndex((x) => x.id === b.id) + (foldedCount[b.id] ?? 0) + 1, 0, nb)
        hist.current.t = 0; commit(n); setFocusId(nb.id)
        return
      }
      insertAfter(b.id, newBlock(LIST.includes(b.type) ? b.type : 'text'))
    } else if (e.key === 'Backspace' && !strip(el.innerHTML)) {
      e.preventDefault()
      if (b.type !== 'text') toText(b.id)
      else if (blocks.length > 1) remove(b.id)
    } else if (e.key === 'Backspace' && caretOffset(el) === 0 && b.type !== 'text') { e.preventDefault(); patch(b.id, { type: 'text', html: sanitize(el.innerHTML) }) }
    else if (e.key === 'Backspace' && caretOffset(el) === 0 && i > 0 && TEXTY.includes(blocks[i - 1].type)) { e.preventDefault(); join(blocks[i - 1], b) }
    else if (e.key === 'Delete' && !strip(el.innerHTML) && blocks.length > 1) { e.preventDefault(); remove(b.id) }
    else if (e.key === 'Delete' && caretOffset(el) === el.textContent.length && i < blocks.length - 1 && TEXTY.includes(blocks[i + 1].type)) { e.preventDefault(); join(b, blocks[i + 1]) }
    else if (e.key === 'ArrowUp' && i > 0 && window.getSelection()?.anchorOffset === 0) focusBlock(i - 1)
    else if (e.key === 'ArrowDown' && i < blocks.length - 1 && window.getSelection()?.anchorOffset === el.textContent.length) focusBlock(i + 1)
  }
  const focusBlock = (i) => { const b = blocks[i]; if (b && TEXTY.includes(b.type)) refs.current[b.id]?.focus(); else if (b) setFocusId(b.id) }

  // Al escribir «->» o «<-» se cambian por una flecha (→ ←)
  const arrowify = () => {
    const sel = window.getSelection()
    const n = sel?.anchorNode
    if (!sel?.isCollapsed || n?.nodeType !== 3) return false
    const off = sel.anchorOffset
    const pair = n.textContent.slice(Math.max(0, off - 2), off)
    const arrow = { '->': '→', '<-': '←' }[pair]
    if (!arrow) return false
    const r = document.createRange(); r.setStart(n, off - 2); r.setEnd(n, off); sel.removeAllRanges(); sel.addRange(r)
    return document.execCommand('insertText', false, arrow)
  }
  // Pegar desde fuera: tablas, listas, títulos, citas y código se convierten en sus bloques; un párrafo suelto se pega en línea con su formato
  const onPaste = (e, b) => {
    const cd = e.clipboardData
    if (!cd) return
    // Una imagen copiada (captura, «copiar imagen» de una web…) se pega como bloque de foto, con sus mismas opciones;
    // varias a la vez, como galería. Si además viene texto (p. ej. celdas de Excel), manda el texto.
    const html = cd.getData('text/html')
    // Bloques copiados de este mismo documento (o de otro): se pegan tal cual, con su formato
    if (html && html.includes('data-pblocks=')) {
      let pb = null
      try { pb = JSON.parse(decodeURIComponent(new DOMParser().parseFromString(html, 'text/html').querySelector('[data-pblocks]').getAttribute('data-pblocks'))) } catch { /* no es nuestro */ }
      if (Array.isArray(pb) && pb.length) {
        e.preventDefault()
        if (b.type === 'callout') { document.execCommand('insertHTML', false, sanitize(htmlOfBlocks(pb))); return } // un Destacado es un solo bloque: dentro entran con su formato (negritas, listas, código…)
        let made = freshIds(pb)
        if (nested) made = made.flatMap((x) => (x.type === 'box' ? x.blocks ?? [] : [x])) // un Post-it no entra en otro
        const cur = blocksRef.current.find((x) => x.id === b.id)
        const at = blocksRef.current.findIndex((x) => x.id === b.id)
        const empty = cur && isEmpty(cur)
        const n = [...blocksRef.current]
        n.splice(empty ? at : at + 1, empty ? 1 : 0, ...made)
        hist.current.t = 0
        commit(n)
        const last = made[made.length - 1]
        if (last && TEXTY.includes(last.type)) setFocusId(last.id)
        return
      }
    }
    const pics = [...(cd.files ?? [])].filter((f) => f.type.startsWith('image/'))
    const onlyImg = !html || !/<(table|p|div|h[1-6]|ul|ol|pre)\b/i.test(html.replace(/<img\b[^>]*>/gi, ''))
    if (pics.length && !cd.getData('text/plain').trim() && onlyImg) {
      e.preventDefault()
      Promise.all(pics.map(async (f, k) => saveFile(f.name && f.name !== 'image.png' ? f : new File([f], `imagen-${Date.now()}-${k}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: f.type })))).then((saved) => {
        const blockMade = saved.length === 1 ? { ...newBlock('image'), file: saved[0] } : { ...newBlock('gallery'), files: saved }
        const cur = blocksRef.current.find((x) => x.id === b.id)
        const at = blocksRef.current.findIndex((x) => x.id === b.id)
        const n = [...blocksRef.current]
        n.splice(cur && isEmpty(cur) ? at : at + 1, cur && isEmpty(cur) ? 1 : 0, blockMade)
        hist.current.t = 0
        commit(n[n.length - 1] === blockMade ? [...n, newBlock()] : n) // si queda la última, hay un bloque debajo para seguir escribiendo
      }).catch(() => {})
      return
    }
    const specs = blocksFromPaste(html, cd.getData('text/plain'))
    if (!specs || !specs.length) { // texto normal: se pega sin los fondos ni colores de la página de origen
      if (html) { e.preventDefault(); document.execCommand('insertHTML', false, sanitize(html, { bg: false })) }
      return
    }
    e.preventDefault()
    if (specs.length === 1 && specs[0].type === 'text') { document.execCommand('insertHTML', false, sanitize(specs[0].html)); return }
    if (b.type === 'callout') { document.execCommand('insertHTML', false, sanitize(htmlOfBlocks(specs.map((sp) => (sp.type === 'table' ? { ...sp, rich: true } : sp))))); return } // dentro de un Destacado: todo entra en el mismo recuadro, con su formato
    const made = specs.map((sp) => {
      if (sp.type === 'table') return { ...newBlock('table'), rich: true, rows: sp.rows }
      if (sp.type === 'code') return { ...newBlock('code'), code: sp.code, ...(sp.lang ? { lang: sp.lang } : {}) }
      if (sp.type === 'divider') return newBlock('divider')
      return newBlock(sp.type, sanitize(sp.html))
    })
    const cur = blocksRef.current.find((x) => x.id === b.id)
    const at = blocksRef.current.findIndex((x) => x.id === b.id)
    const empty = cur && isEmpty(cur)
    const n = [...blocksRef.current]
    n.splice(empty ? at : at + 1, empty ? 1 : 0, ...made)
    hist.current.t = 0
    commit(n)
    const last = made[made.length - 1]
    if (TEXTY.includes(last.type)) setFocusId(last.id)
    else if (at + made.length >= n.length - (empty ? 0 : 0) - 0 && n[n.length - 1] === last) { const tail = newBlock(); commit([...n, tail]); setFocusId(tail.id) } // si lo pegado acaba en tabla o código y era lo último, queda un bloque debajo para seguir escribiendo
  }
  const onInput = (e, b) => {
    markTyping()
    // Dentro de un Destacado: «- », «* » o «1. » al empezar una línea la convierten en lista (con puntos o numerada)
    if (b.type === 'callout' && /^[ \u00A0]$/.test(e.nativeEvent?.data ?? '') && /^insert/.test(e.nativeEvent?.inputType ?? '')) {
      const sl = window.getSelection(); const nd = sl?.anchorNode
      if (nd?.nodeType === 3 && sl.isCollapsed && e.currentTarget.contains(nd) && !nd.parentElement.closest('li')) {
        const before = nd.textContent.slice(0, sl.anchorOffset)
        const first = !nd.previousSibling || nd.previousSibling.nodeName === 'BR' || nd.previousSibling.nodeType === 1
        const mm = first && /^(?:[-*•]|1[.)])[ \u00A0]$/.exec(before)
        if (mm) {
          const n = mm[0].length
          document.execCommand(/^1/.test(mm[0]) ? 'insertOrderedList' : 'insertUnorderedList')
          const s2 = window.getSelection(); const t = s2?.anchorNode
          if (t?.nodeType === 3 && t.textContent.slice(0, n) === mm[0]) { // se quita el marcador y el cursor se queda en su sitio
            const off = s2.anchorOffset
            const rg = document.createRange(); rg.setStart(t, 0); rg.setEnd(t, n); rg.deleteContents()
            const cc = document.createRange(); cc.setStart(t, Math.max(0, off - n)); cc.collapse(true); s2.removeAllRanges(); s2.addRange(cc)
          }
        }
      }
    }
    // «---» en una línea de texto sola → divisor (y debajo queda una línea para seguir escribiendo)
    if (e.nativeEvent?.data === '-' && b.type === 'text' && e.currentTarget.textContent.trim() === '---') {
      e.currentTarget.innerHTML = ''; setMenu(null)
      const nb = newBlock()
      hist.current.t = 0
      commit(blocksRef.current.flatMap((x) => (x.id === b.id ? [{ ...newBlock('divider'), id: b.id }, nb] : [x])))
      setFocusId(nb.id)
      return
    }
    if (e.nativeEvent?.data === '`') { // `así` se convierte en código dentro de la línea
      const sl = window.getSelection(); const nd = sl?.anchorNode
      const m = nd?.nodeType === 3 && e.currentTarget.contains(nd) && !nd.parentElement.closest('code') ? nd.textContent.slice(0, sl.anchorOffset).match(/`([^`\n]+)`$/) : null
      if (m) {
        const r = document.createRange(); r.setStart(nd, sl.anchorOffset - m[0].length); r.setEnd(nd, sl.anchorOffset); sl.removeAllRanges(); sl.addRange(r)
        document.execCommand('insertHTML', false, `<code>${m[1].replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</code>&nbsp;`)
        return
      }
    }
    if (['>', '-'].includes(e.nativeEvent?.data) && arrowify()) return
    const el = e.currentTarget
    const text = el.textContent
    const sc = b.type === 'text' && SHORTCUTS.find(([re]) => re.test(text))
    if (sc) { el.innerHTML = ''; setMenu(null); patch(b.id, { type: sc[1], html: '', ...(sc[1] === 'todo' ? { checked: false } : {}) }); return }
    // Marca puesta DELANTE de un texto que ya existe («## » antes de un título…): el bloque cambia de tipo y se queda el resto del texto
    if (e.nativeEvent?.data === ' ' && TEXTY.includes(b.type) && b.type !== 'callout') {
      const m = text.match(/^(#{1,4}|[-*]|>|1\.|\[\])\s(?=\S)/)
      const kind = m && { '#': 'h1', '##': 'h2', '###': 'h3', '####': 'h4', '-': 'bullet', '*': 'bullet', '>': 'quote', '1.': 'numbered', '[]': 'todo' }[m[1]]
      const first = el.firstChild
      const sel = window.getSelection()
      if (kind && kind !== b.type && first?.nodeType === 3 && sel?.anchorNode === first && sel.anchorOffset === m[0].length && first.textContent.startsWith(m[0])) {
        first.textContent = first.textContent.slice(m[0].length)
        setMenu(null)
        patch(b.id, { type: kind, html: sanitize(el.innerHTML), ...(kind === 'todo' ? { checked: false } : {}) })
        const r = document.createRange(); r.setStart(first, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r)
        return
      }
    }
    // «+» o «/» al empezar abre el menú de bloques
    if ((text.startsWith('/') || text.startsWith('+')) && TEXTY.includes(b.type)) {
      const r = el.getBoundingClientRect()
      const z = parseFloat(getComputedStyle(el.closest('.d-app') ?? document.body).zoom) || 1 // la vista portátil va con zoom
      setMenu((m) => ({ id: b.id, q: text.slice(1), i: m?.id === b.id && m.q === text.slice(1) ? m.i : 0, x: r.left / z, y: r.bottom / z }))
    } else if (menu?.id === b.id) setMenu(null)
    patch(b.id, { html: sanitize(el.innerHTML) })
  }

  // Pulsar en el hueco de la página: escribe en el último bloque (o crea uno si el último no es de texto)
  // Casilla (de ESTA página, no de un recuadro de dentro) que contiene el elemento
  const ownSlot = (t) => { let el = t?.closest?.('.block-slot'); while (el && el.parentElement !== pageRef.current) el = el.parentElement?.closest('.block-slot'); return el }
  const rememberBlock = (e) => { const id = ownSlot(e.target)?.dataset.id; if (id) lastId.current = id } // dónde estás escribiendo
  const pickRange = (a, b) => {
    const x = blocks.findIndex((k) => k.id === a); const y = blocks.findIndex((k) => k.id === b)
    if (x < 0 || y < 0) return
    setSel(blocks.slice(Math.min(x, y), Math.max(x, y) + 1).map((k) => k.id))
  }
  const onPageDown = (e) => {
    if (e.target.closest?.('.sel-bar')) return
    const anchor = lastId.current
    rememberBlock(e)
    if (e.button !== 0) return
    if (e.target.closest?.('.row-tools, .row-menu, .row-backdrop')) return
    let slot = ownSlot(e.target)
    if (!slot && e.target === pageRef.current) { // margen de la página: la casilla más cercana por altura
      const all = [...pageRef.current.children].filter((c) => c.classList?.contains('block-slot'))
      slot = all.find((el) => { const r = el.getBoundingClientRect(); return e.clientY >= r.top && e.clientY <= r.bottom }) ?? null
    }
    if ((e.ctrlKey || e.metaKey) && slot) { // Ctrl/Cmd + clic: marca o desmarca ese bloque (varios a la vez)
      e.preventDefault(); lastId.current = slot.dataset.id; dragSel.current = null
      document.activeElement?.blur?.(); window.getSelection()?.removeAllRanges()
      setSel((cur) => (cur.includes(slot.dataset.id) ? cur.filter((x) => x !== slot.dataset.id) : [...cur, slot.dataset.id]))
      return
    }
    if (e.shiftKey && anchor && slot && slot.dataset.id !== anchor) { e.preventDefault(); lastId.current = anchor; pickRange(anchor, slot.dataset.id); setPicking(false); window.getSelection()?.removeAllRanges(); return }
    if (sel.length) setSel([])
    if (range) setRange(null)
    dragSel.current = slot ? { id: slot.dataset.id, on: false, start: caretAt(e.clientX, e.clientY) } : null
  }
  const firstSel = blocks.find((b) => sel.includes(b.id))?.id // el primero (en el orden del documento) lleva la barra
  const wrapSel = () => {
    const idx = blocks.map((b, k) => (sel.includes(b.id) ? k : -1)).filter((k) => k >= 0)
    if (!idx.length) return
    const box = { ...newBlock('box'), blocks: idx.map((k) => blocks[k]) }
    commit(blocks.flatMap((b, k) => (k === idx[0] ? [box] : sel.includes(b.id) ? [] : [b])))
    setSel([])
  }
  const deleteSel = () => {
    const first = blocks.findIndex((b) => sel.includes(b.id))
    const n = blocks.filter((b) => !sel.includes(b.id))
    commit(n.length ? n : [newBlock()])
    setSel([])
    const near = n[Math.max(0, Math.min(first, n.length) - 1)]
    if (near && TEXTY.includes(near.type)) setFocusId(near.id) // el cursor queda en el bloque de arriba
  }
  const copySel = () => { const chosen = blocks.filter((b) => sel.includes(b.id)); writeClip(chosen, chosen.map(plainOf).join('\n')) }
  // Selección «desde donde haces clic hasta donde sueltas» entre varios bloques (el navegador no deja seleccionar a través de bloques)
  const caretAt = (x, y) => {
    const page = pageRef.current
    const slots = [...page.children].filter((c) => c.classList?.contains('block-slot'))
    if (!slots.length) return null
    const above = y < slots[0].getBoundingClientRect().top
    const below = y > slots[slots.length - 1].getBoundingClientRect().bottom
    const slot = slots.find((el) => { const r = el.getBoundingClientRect(); return y >= r.top && y <= r.bottom }) ?? (above ? slots[0] : slots[slots.length - 1])
    const id = slot.dataset.id
    const b = blocksRef.current.find((k) => k.id === id)
    const el = refs.current[id]
    if (!b || !el || !TEXTY.includes(b.type)) return { id, off: below ? 1e9 : 0 }
    if (above) return { id, off: 0 }
    if (below) return { id, off: el.textContent.length }
    let node = null; let offset = 0
    const cp = document.caretPositionFromPoint?.(x, y)
    if (cp) { node = cp.offsetNode; offset = cp.offset } else { const rg = document.caretRangeFromPoint?.(x, y); if (rg) { node = rg.startContainer; offset = rg.startOffset } }
    if (node && el.contains(node)) return { id, off: offsetIn(el, node, offset) }
    const r = el.getBoundingClientRect()
    return { id, off: x < r.left + r.width / 2 ? 0 : el.textContent.length }
  }
  const setRangeNorm = (p, q) => {
    const ip = blocksRef.current.findIndex((k) => k.id === p.id); const iq = blocksRef.current.findIndex((k) => k.id === q.id)
    if (ip < 0 || iq < 0) return
    const [a, b] = ip < iq || (ip === iq && p.off <= q.off) ? [p, q] : [q, p]
    setRange((cur) => (cur && cur.a.id === a.id && cur.a.off === a.off && cur.b.id === b.id && cur.b.off === b.off ? cur : { a, b }))
  }
  const rangeIds = (() => {
    if (!range) return []
    const i = blocks.findIndex((k) => k.id === range.a.id); const j = blocks.findIndex((k) => k.id === range.b.id)
    return i < 0 || j < 0 ? [] : blocks.slice(i, j + 1).map((k) => k.id)
  })()
  const bounds = (id) => ({ from: id === range.a.id ? range.a.off : 0, to: id === range.b.id ? range.b.off : Infinity })
  const copyRange = () => {
    const parts = rangeIds.map((id) => { const b = blocks.find((k) => k.id === id); if (!b) return null; if (!TEXTY.includes(b.type)) return b; const { from, to } = bounds(id); return { ...b, html: sanitize(sliceHtml(b.html, from, to)) } }).filter(Boolean)
    writeClip(parts, parts.map((b) => (TEXTY.includes(b.type) ? plainHtml(b.html) : plainOf(b))).join('\n'))
  }
  const deleteRange = () => {
    if (!range || !rangeIds.length) return
    const A = blocks.find((k) => k.id === rangeIds[0]); const Z = blocks.find((k) => k.id === rangeIds[rangeIds.length - 1])
    const aText = TEXTY.includes(A.type); const zText = TEXTY.includes(Z.type)
    const head = aText ? sliceHtml(A.html, 0, range.a.off) : ''
    const tail = zText ? sliceHtml(Z.html, range.b.off, Infinity) : ''
    const keep = aText ? A : zText ? Z : null
    const merged = keep ? { ...keep, html: sanitize(head + tail) } : null
    const n = blocks.filter((k) => !rangeIds.includes(k.id) || k.id === keep?.id).map((k) => (k.id === keep?.id ? merged : k))
    hist.current.t = 0
    commit(n.length ? n : [newBlock()])
    setRange(null)
    if (keep) placeCaret(keep.id, plainHtml(head).length)
  }
  // Subrayador: aplica el color a lo marcado (entre bloques o dentro de uno) y suelta la selección
  const applyPen = (color) => {
    if (range && rangeIds.length) {
      const next = blocksRef.current.map((b) => {
        if (!rangeIds.includes(b.id) || !TEXTY.includes(b.type)) return b
        const d = document.createElement('div'); d.innerHTML = b.html
        const bd = bounds(b.id)
        const [f0, t0] = snapWord(d.textContent, bd.from, Math.min(bd.to, d.textContent.length))
        const [from, to] = trimSpaces(d.textContent, f0, t0)
        if (to <= from) return b // nada que subrayar (solo espacios o vacío)
        wrapHl(d, from, to, color)
        const html = sanitize(d.innerHTML)
        return html === sanitize(b.html) ? b : { ...b, html }
      })
      setRange(null)
      if (next.every((b, i) => b === blocksRef.current[i])) return true // no cambió nada
      hist.current.t = 0; commit(next)
      return true
    }
    const sel = window.getSelection()
    if (!sel?.rangeCount || sel.isCollapsed) return false
    const rg = sel.getRangeAt(0)
    const node = rg.commonAncestorContainer.nodeType === 1 ? rg.commonAncestorContainer : rg.commonAncestorContainer.parentElement
    const el = node?.closest?.('[contenteditable=true]')
    if (!el || el.closest('.blocks-page') !== pageRef.current) return false // cada editor atiende solo lo suyo (el de dentro de un Post-it, el suyo)
    const [f0, t0] = snapWord(el.textContent, offsetIn(el, rg.startContainer, rg.startOffset), offsetIn(el, rg.endContainer, rg.endOffset))
    const [from, to] = trimSpaces(el.textContent, f0, t0)
    if (to <= from) { sel.removeAllRanges(); return true } // marcaste solo espacios o nada: no se subraya
    const d = document.createElement('div'); d.innerHTML = el.innerHTML
    wrapHl(d, from, to, color)
    hist.current.t = 0
    el.innerHTML = sanitize(d.innerHTML)
    el.dispatchEvent(new Event('input', { bubbles: true })) // el editor guarda el cambio como si lo hubieras escrito
    sel.removeAllRanges()
    return true
  }
  live.current = { pen, applyPen, sel, blocks, deleteSel, copySel, pickRange, range, copyRange, deleteRange, caretAt, setRangeNorm }
  // Arrastrar el ratón de un bloque a otro marca los bloques enteros; Supr/Retroceso los borra, Ctrl+C los copia, Esc los suelta
  useEffect(() => {
    const move = (e) => {
      const d = dragSel.current
      if (!d || e.buttons !== 1) return
      const page = pageRef.current
      if (!page) return
      const pr = page.getBoundingClientRect()
      const outside = e.clientY < pr.top || e.clientY > pr.bottom
      if (nested && outside) { if (d.on) setRange(null); return } // fuera del recuadro manda la página de fuera
      const slots = [...page.children].filter((c) => c.classList?.contains('block-slot'))
      if (!slots.length) return
      const y = e.clientY
      const hit = slots.find((el) => { const r = el.getBoundingClientRect(); return y >= r.top && y <= r.bottom }) ?? (y < slots[0].getBoundingClientRect().top ? slots[0] : slots[slots.length - 1])
      if (!d.on && hit.dataset.id === d.id) return
      if (!d.on) { d.on = true; setPicking(true); window.getSelection()?.removeAllRanges(); document.activeElement?.blur?.() }
      const end = live.current.caretAt(e.clientX, e.clientY)
      if (end && d.start) live.current.setRangeNorm(d.start, end)
    }
    const up = () => { if (live.current.pen?.on) setTimeout(() => live.current.applyPen(live.current.pen.color), 0); if (dragSel.current?.on) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false }, 0) } dragSel.current = null; setPicking(false) } // tras arrastrar no debe saltar el «clic» de la página (enfocaba el último bloque)
    const key = (e) => {
      const L = live.current
      // S: con texto marcado lo subraya; sin escribir en ningún sitio, activa o desactiva el rotulador
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.defaultPrevented && !e.target.closest?.('input, textarea, select')) {
        const sl = window.getSelection()
        const marked = L.range || (sl && !sl.isCollapsed && pageRef.current?.contains(sl.anchorNode))
        if (marked) { if (L.applyPen(L.pen.color === 'none' ? 'amarillo' : L.pen.color)) { e.preventDefault(); setPenStore((p) => ({ ...p, on: true, color: p.color })) } return }
        if (!e.target.isContentEditable && !nested) { e.preventDefault(); setPenStore((p) => ({ ...p, on: !p.on })); return }
      }
      if (L.range && !e.__picked) {
        const k = e.key.toLowerCase()
        if (e.key === 'Escape') { setRange(null); return }
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); L.deleteRange(); return }
        if ((e.ctrlKey || e.metaKey) && k === 'c') { e.preventDefault(); L.copyRange(); return }
        if ((e.ctrlKey || e.metaKey) && k === 'x') { e.preventDefault(); L.copyRange(); L.deleteRange(); return }
      }
      if (!L.sel.length || e.__picked) return
      if (e.key === 'Escape') { setSel([]); return }
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); L.deleteSel() } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); L.copySel() }
    }
    const away = (e) => { if (!pageRef.current?.contains(e.target) && !e.target.closest?.('.sel-bar')) { setSel([]); setRange(null) } }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); document.addEventListener('keydown', key); document.addEventListener('pointerdown', away)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', away) }
  }, [])
  const onPageClick = (e) => {
    if (suppressClick.current) return
    if (e.target !== e.currentTarget && !e.target.classList.contains('blocks-tail')) return
    if (e.target.closest('.blocks-page') !== e.currentTarget) return // el hueco de un recuadro de dentro lo gestiona él
    // Pulsar en el margen junto a un bloque: el cursor va a ESE bloque (al principio), no al final del documento
    const slots = [...(pageRef.current?.querySelectorAll(':scope > .block-slot') ?? [])]
    const lastBox = slots[slots.length - 1]?.getBoundingClientRect()
    if (lastBox && e.clientY < lastBox.bottom) {
      const hit = slots.find((el) => { const r = el.getBoundingClientRect(); return e.clientY >= r.top && e.clientY <= r.bottom })
        ?? slots.reduce((best, el) => { const r = el.getBoundingClientRect(); const d = Math.min(Math.abs(e.clientY - r.top), Math.abs(e.clientY - r.bottom)); return !best || d < best.d ? { el, d } : best }, null)?.el
      const b = blocks.find((x) => x.id === hit?.dataset.id)
      const target = b && TEXTY.includes(b.type) ? refs.current[b.id] : null
      if (target) {
        target.focus()
        const r = document.createRange(); r.selectNodeContents(target); r.collapse(true)
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r)
      }
      return
    }
    const last = blocks[blocks.length - 1]
    if (last && TEXTY.includes(last.type) && !folded.has(last.id)) refs.current[last.id]?.focus()
    else insertAt(blocks.length, last && folded.has(last.id) ? { ...newBlock(), free: true } : newBlock()) // si lo último está plegado, se escribe en un bloque nuevo fuera
  }

  // Texto que llega de fuera (seleccionado en el PDF): se añade al final como un párrafo
  if (appendRef) {
    appendRef.current = (payload) => {
      hist.current.t = 0 // lo que llega del PDF es siempre un paso propio de Ctrl+Z (aunque acabes de escribir)
      const esc = (t) => sanitize(String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])))
      const one = (p) => {
        if (p.type === 'table') return [{ ...newBlock('table'), rows: p.rows }]
        if (p.type === 'code') return [{ ...newBlock('code'), code: p.code, ...(p.lang ? { lang: p.lang } : {}) }]
        if (p.items) return p.items.map((t) => newBlock(p.type, esc(t)))
        return [newBlock(p.type, esc(p.text))]
      }
      const list = Array.isArray(payload) ? payload : [typeof payload === 'string' ? { type: 'text', text: payload } : payload]
      const made = list.flatMap(one) // varios trozos (título + texto…) entran juntos y en su orden
      // Entra justo debajo del bloque donde estaba el cursor / donde pulsaste por última vez; si no hay, al final
      const at = blocks.findIndex((x) => x.id === lastId.current)
      const i = at >= 0 ? at : blocks.length - 1
      const cur = blocks[i]
      const next = cur && cur.type === 'text' && !strip(cur.html) ? [...blocks.slice(0, i), ...made, ...blocks.slice(i + 1)] : [...blocks.slice(0, i + 1), ...made, ...blocks.slice(i + 1)] // un bloque vacío se aprovecha
      commit(next.length ? next : made)
      lastId.current = made[made.length - 1]?.id
    }
  }

  const only = blocks.length === 1 && isEmpty(blocks[0])

  // Resaltado del texto seleccionado entre bloques (API de resaltado del navegador)
  useEffect(() => {
    if (!range || typeof Highlight === 'undefined' || !CSS.highlights) return undefined
    const rs = []
    rangeIds.forEach((id) => {
      const el = refs.current[id]; const b = blocks.find((k) => k.id === id)
      if (!el || !b || !TEXTY.includes(b.type)) return
      const { from, to } = bounds(id)
      rs.push(domRangeFor(el, from, to))
    })
    CSS.highlights.set('blk-sel', new Highlight(...rs))
    return () => CSS.highlights.delete('blk-sel')
  }, [range, blocks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Títulos desplegables: un título plegado oculta lo que tiene debajo hasta el siguiente título de su nivel o superior
  const headLevel = (b) => (['h1', 'h2', 'h3', 'h4'].includes(b.type) ? Number(b.type[1]) : 0)
  const folded = new Set()
  const foldedCount = {}
  {
    let cut = 0; let owner = null
    for (const b of blocks) {
      const l = headLevel(b)
      if (cut && ((l && l <= cut) || b.free)) { cut = 0; owner = null } // un bloque «libre» (creado fuera de un título plegado) cierra la sección y no se oculta
      if (cut) { folded.add(b.id); foldedCount[owner] += 1; continue }
      if (l && b.collapsed && !nested) { cut = l; owner = b.id; foldedCount[b.id] = 0 }
    }
  }

  // Al abrir en un punto concreto (seguir unos apuntes en otro tema): se baja hasta ese título y el cursor queda en lo siguiente
  useEffect(() => {
    if (!scrollToId || nested) return undefined
    const t = setTimeout(() => {
      pageRef.current?.querySelector(`:scope > .block-slot[data-id="${scrollToId}"]`)?.scrollIntoView({ block: 'start' })
      const k = blocksRef.current.findIndex((b) => b.id === scrollToId)
      const next = blocksRef.current[k + 1]
      if (next && TEXTY.includes(next.type)) placeCaret(next.id, 0)
    }, 300)
    return () => clearTimeout(t)
  }, [scrollToId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Índice: los títulos del documento, para saltar a ellos
  const heads = blocks.filter((b) => ['h1', 'h2', 'h3'].includes(b.type) && strip(b.html)).map((b) => ({ id: b.id, level: Number(b.type[1]), text: plainHtml(b.html).trim() }))
  const [curHead, setCurHead] = useState(null)
  const trackHead = () => {
    const page = pageRef.current
    if (!page || nested) return
    const top = page.getBoundingClientRect().top + 40
    let cur = null
    for (const h of heads) { const el = page.querySelector(`:scope > .block-slot[data-id="${h.id}"]`); if (el && el.getBoundingClientRect().top <= top) cur = h.id }
    setCurHead(cur ?? heads[0]?.id ?? null)
  }
  useEffect(trackHead, [blocks])
  const goTo = (id) => {
    const el = pageRef.current?.querySelector(`:scope > .block-slot[data-id="${id}"]`)
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className={nested ? 'blocks-nested' : 'card blocks'}>
      {!nested && <div className="blocks-bar"><span className={`doc-status ${saving ? 'on' : ''}`} role="status" aria-live="polite">{saving ? 'Guardando…' : ''}</span><span className={`hl-tool ${pen.on ? 'on' : ''}`} role="group" aria-label="Subrayador" onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className="hl-pen" aria-pressed={pen.on} title="Subrayador: pasa por el texto con el color elegido" aria-label="Subrayador" onClick={() => setPen((p) => ({ ...p, on: !p.on }))}><Icon name="marker" size={16} /></button>
          {Object.entries(POSTIT_COLORS).map(([id, c]) => <button type="button" key={id} className={`hl-dot ${pen.on && pen.color === id ? 'on' : ''}`} style={{ background: c.bar }} title={c.label} aria-label={`Subrayar en ${c.label}`}
            onClick={() => { setPen({ on: true, color: id }); applyPen(id) }} />)}
          <button type="button" className={`hl-x ${pen.on && pen.color === 'none' ? 'on' : ''}`} title="Quitar el subrayado de lo que pases" aria-label="Quitar subrayado" onClick={() => { setPen({ on: true, color: 'none' }); applyPen('none') }}><Icon name="close" size={13} strokeWidth={2.8} /></button>
        </span>{exportAs && <button type="button" className="pill pill-sm" onClick={() => setExporting(true)} title="Exportar a PDF" aria-label="Exportar a PDF"><Icon name="pdf" size={16} /></button>}{bar}</div>}
      {!nested && exporting && <ExportDialog title={exportAs.title} subtitle={exportAs.subtitle} blocks={blocks} onClose={() => setExporting(false)} />}
      <div ref={pageRef} className={`blocks-page ${nested ? 'nested' : ''} ${picking ? 'is-picking' : ''} ${pen.on ? 'pen-on' : ''}`} role="group" aria-label={label} onKeyDownCapture={onUndoKey} onScroll={trackHead} onPointerDownCapture={onPageDown} onFocus={rememberBlock} onKeyUp={rememberBlock} onClick={onPageClick} onDragOver={dragOverPage} onDragLeave={(e) => { if (drag?.foreign && !e.currentTarget.contains(e.relatedTarget)) setDrag(null) }} onDrop={(e) => { e.preventDefault(); if (drag?.foreign) e.stopPropagation(); dropDrag() }}>
        {blocks.map((b, i) => (folded.has(b.id) ? null : (
          <div key={b.id} data-id={b.id} className={`block-slot slot-${b.type} ${sel.includes(b.id) ? `is-picked ${sel.includes(blocks[i - 1]?.id) && !folded.has(blocks[i - 1]?.id) ? '' : 'pk-top'} ${sel.includes(blocks[i + 1]?.id) ? '' : 'pk-bot'}` : ''} ${rangeIds.includes(b.id) && !TEXTY.includes(b.type) ? 'range-whole' : ''} ${drag?.id === b.id ? 'is-dragging' : ''} ${drag?.over === b.id && drag.id !== b.id ? (drag.merge ? 'drop-merge' : drag.after ? 'drop-after' : 'drop-before') : ''}`}>
            <Gap />
            {(range ? rangeIds[0] : firstSel) === b.id && (
              <span className={`sel-bar ${i === 0 ? 'in' : ''}`} role="toolbar" aria-label="Selección">
                {range
                  ? <>
                    <span className="sel-n">{rangeIds.length} {rangeIds.length === 1 ? 'bloque' : 'bloques'}</span>
                    <button type="button" onClick={copyRange}><Icon name="copy" size={15} />Copiar</button>
                    <button type="button" onClick={deleteRange}><Icon name="trash" size={15} />Borrar</button>
                  </>
                  : <>
                    <span className="sel-n">{sel.length} {sel.length === 1 ? 'bloque' : 'bloques'}</span>
                    {!nested && <button type="button" onClick={wrapSel}><Icon name="doc" size={15} />Post-it</button>}
                    <button type="button" onClick={copySel}><Icon name="copy" size={15} />Copiar</button>
                    <button type="button" onClick={deleteSel}><Icon name="trash" size={15} />Borrar</button>
                  </>}
              </span>
            )}
            <span className={`row-tools ${headLevel(b) && !nested ? 'has-fold' : ''}`}>
              {headLevel(b) > 0 && !nested && (
                <button type="button" className={`row-fold ${b.collapsed ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); patch(b.id, { collapsed: !b.collapsed }) }} aria-expanded={!b.collapsed} aria-label={b.collapsed ? 'Desplegar el título' : 'Plegar el título'} title={b.collapsed ? 'Desplegar' : 'Plegar todo lo de debajo'}><Icon name={b.collapsed ? 'right' : 'down'} size={16} strokeWidth={2.6} /></button>
              )}
              <button type="button" className="row-plus" onClick={(e) => { e.stopPropagation(); insertAt(indexOf(b.id) + (b.collapsed ? (foldedCount[b.id] ?? 0) : 0) + 1, b.collapsed ? { ...newBlock(), free: true } : newBlock()) }} aria-label="Añadir un bloque de texto debajo" title="Añadir un bloque debajo"><Icon name="plus" size={16} strokeWidth={2.6} /></button>
              <button type="button" className="row-grip" draggable aria-label="Mover o abrir opciones del bloque" title="Arrastra para mover · pulsa para opciones"
                onClick={(e) => { e.stopPropagation(); setRowUp(e.currentTarget.getBoundingClientRect().bottom > window.innerHeight * 0.5); setRowQ(''); setRowI(0); setRowMenu(rowMenu === b.id ? null : b.id) }}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); const slot = e.currentTarget.closest('.block-slot'); if (slot) e.dataTransfer.setDragImage(slot, 0, 0); setRowMenu(null); setDrag({ id: b.id, over: null, after: false }); DRAGGING = { block: b, owner: me, detach: () => { const n = blocksRef.current.filter((x) => x.id !== b.id); commit(n.length ? n : [newBlock()]) }, resetOver: () => setDrag((d) => (d ? { ...d, over: null } : d)), finish: () => setDrag(null) } }}
                onDragEnd={() => { setDrag(null); DRAGGING = null }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">{[3, 7, 11].flatMap((y) => [4.5, 9.5].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" />))}</svg>
              </button>
              {rowMenu === b.id && (
                <>
                  <span className="row-backdrop" onClick={(e) => { e.stopPropagation(); setRowMenu(null) }} />
                  <span className={`card row-menu ${rowUp ? 'up' : ''}`} role="menu">
                    <input className="row-menu-q" autoFocus value={rowQ} placeholder="Tipo de bloque… (escribe para buscar)" aria-label="Buscar un tipo de bloque"
                      onChange={(e) => { setRowQ(e.target.value); setRowI(0) }}
                      onKeyDown={(e) => {
                        const st = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key]
                        if (st) { e.preventDefault(); setRowI(Math.max(0, Math.min(rowOptions.length - 1, rowI + st))) }
                        else if (e.key === 'Enter') { e.preventDefault(); if (rowOptions[rowI]) convert(b.id, rowOptions[rowI].type) }
                        else if (e.key === 'Escape') setRowMenu(null)
                      }} />
                    <div className="tile-grid">
                      {rowOptions.map((t, k) => (
                        <button key={t.type} role="menuitemradio" aria-checked={b.type === t.type} className={`tile ${b.type === t.type ? 'on' : ''} ${k === rowI ? 'hi' : ''}`} onMouseEnter={() => setRowI(k)} onClick={() => convert(b.id, t.type)}><Tile t={t} /></button>
                      ))}
                    </div>
                    {rowOptions.length === 0 && <span className="row-menu-t">Sin resultados</span>}
                    <hr className="row-menu-sep" />
                    {nested && onSplit && i > 0 && <button role="menuitem" onClick={() => { setRowMenu(null); onSplit(b.id) }}><Icon name="minus" size={16} />Dividir el post-it desde aquí</button>}
                    {b.type !== 'image' && b.type !== 'gallery' && <button role="menuitem" onClick={() => duplicate(b.id)}><Icon name="note" size={16} />Duplicar</button>}
                    <button role="menuitem" onClick={() => { setRowMenu(null); remove(b.id) }}><Icon name="trash" size={16} />Eliminar</button>
                  </span>
                </>
              )}
            </span>
            <div className={`block block-${b.type}`}>
              <div className={`block-body bt-${b.type}`} onInputCapture={markTyping}>
                {b.type === 'bullet' && <span className="block-mark" aria-hidden="true">•</span>}
                {b.type === 'numbered' && <span className="block-mark" aria-hidden="true">{numberOf(i)}.</span>}
                {b.type === 'todo' && <input type="checkbox" className="block-check" checked={!!b.checked} onChange={() => patch(b.id, { checked: !b.checked })} aria-label="Hecha" />}
                {b.type === 'divider' && <hr className="block-divider" tabIndex={0} onKeyDown={(e) => (e.key === 'Backspace' || e.key === 'Delete') && remove(b.id)} />}
                {b.type === 'code' && <CodeBlock pen={pen} block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} focus={focusId === b.id} onFocused={() => setFocusId(null)} onEmptyBackspace={() => remove(b.id)} />}
                {b.type === 'box' && (
                  <div className="box-wrap" style={{ '--pb': (POSTIT_COLORS[b.color] ?? POSTIT_COLORS.amarillo).bar, '--pf': (POSTIT_COLORS[b.color] ?? POSTIT_COLORS.amarillo).bg }}>
                    <span className="pi-colors" role="radiogroup" aria-label="Color del post-it">
                      {Object.entries(POSTIT_COLORS).map(([id, c]) => <button type="button" key={id} role="radio" aria-checked={(b.color ?? 'amarillo') === id} className={(b.color ?? 'amarillo') === id ? 'on' : ''} style={{ background: c.bar }} title={c.label} aria-label={c.label} onClick={() => patch(b.id, { color: id })} />)}
                    </span>
                    <BlockEditor key={rev} nested label="Post-it" value={{ blocks: b.blocks ?? [] }} onChange={(doc) => patch(b.id, { blocks: doc.blocks })} onExit={() => insertAfter(b.id, newBlock())} onSplit={(childId) => splitBox(b.id, childId)} />
                  </div>
                )}
                {b.type === 'table' && <TableBlock block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} focus={focusId === b.id} onFocused={() => setFocusId(null)} />}
                {b.type === 'link' && <LinkBlock block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} focus={focusId === b.id} onFocused={() => setFocusId(null)} />}
                {b.type === 'gallery' && <GalleryBlock block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} onRemove={() => remove(b.id)} />}
                {b.type === 'image' && <ImageBlock block={b} onChange={(nb) => commit(blocks.map((x) => (x.id === b.id ? nb : x)))} onRemove={() => remove(b.id)} />}
                {TEXTY.includes(b.type) && (
                  <Line block={b} refCb={(el) => { if (el) refs.current[b.id] = el }} focus={focusId === b.id} done={() => setFocusId(null)}
                    onInput={(e) => onInput(e, b)} onKeyDown={(e) => onKeyDown(e, b, i)} onPaste={(e) => onPaste(e, b)}
                    placeholder={only ? 'Escribe aquí o pulsa + o «/» para elegir un bloque' : ''} />
                )}
                {b.collapsed && headLevel(b) > 0 && !nested && (
                  <button type="button" className="h-folded" onClick={() => patch(b.id, { collapsed: false })} title="Desplegar">{foldedCount[b.id] ? `${foldedCount[b.id]} ${foldedCount[b.id] === 1 ? 'bloque oculto' : 'bloques ocultos'}` : 'Vacío'}</button>
                )}
              </div>
            </div>
          </div>
        )))}
        <Gap last />
        <div className="blocks-tail" aria-hidden="true" />
      </div>
      {!nested && heads.length > 1 && (
        <nav className="doc-index" aria-label="Índice" tabIndex={0}>
          <span className="di-ticks" aria-hidden="true">{heads.map((h) => <i key={h.id} className={h.id === curHead ? 'on' : ''} style={{ width: 24 - (h.level - 1) * 7 }} />)}</span>
          <span className="card di-pop">
            <b>Índice</b>
            {heads.map((h) => <button type="button" key={h.id} className={`di-it ${h.id === curHead ? 'on' : ''}`} style={{ paddingLeft: 8 + (h.level - 1) * 14 }} onClick={() => goTo(h.id)}><span className="di-t">{h.text}</span></button>)}
          </span>
        </nav>
      )}
      {menu && (
        <div className="card slash-menu" role="listbox" aria-label="Tipo de bloque" style={{ left: menu.x, top: menu.y + 6 }}
          ref={(el) => { // si no cabe por abajo, sube lo justo (la vista portátil va con zoom)
            if (!el) return
            const z = parseFloat(getComputedStyle(el.closest('.d-app') ?? document.body).zoom) || 1
            const over = el.getBoundingClientRect().bottom - (window.innerHeight - 8)
            if (over > 0) el.style.top = `${Math.max(8 / z, menu.y + 6 - over / z)}px`
          }}>
          <div className="tile-grid">
            {options.map((t, k) => (
              <button key={t.type} role="option" aria-selected={k === menu.i} className={`tile ${k === menu.i ? 'on' : ''}`} onMouseDown={(e) => { e.preventDefault(); pick(t.type) }}><Tile t={t} /></button>
            ))}
          </div>
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
function Line({ block, refCb, focus, done, onInput, onKeyDown, onPaste, placeholder }) {
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
      onInput={onInput} onKeyDown={onKeyDown} onPaste={onPaste} spellCheck />
  )
}
