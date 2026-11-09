// Modelo de los documentos (apuntes y soluciones): una lista de bloques estilo Notion.
// block = { id, type, html, checked? }  ·  `html` solo lleva formato permitido (negrita, cursiva…).
import { sanitize } from './richText.js'

export const BLOCK_TYPES = [
  { type: 'text', label: 'Texto', icon: 'note', hint: 'texto normal parrafo' },
  { type: 'h1', label: 'Título 1', icon: 'title', hint: 'titulo grande h1 #' },
  { type: 'h2', label: 'Título 2', icon: 'title', hint: 'titulo mediano h2 ##' },
  { type: 'h3', label: 'Título 3', icon: 'title', hint: 'titulo pequeño h3 ###' },
  { type: 'bullet', label: 'Lista con puntos', icon: 'list', hint: 'lista puntos viñetas -' },
  { type: 'numbered', label: 'Lista numerada', icon: 'list', hint: 'lista numerada 1.' },
  { type: 'todo', label: 'Tareas', icon: 'check', hint: 'tareas casillas checklist []' },
  { type: 'quote', label: 'Cita', icon: 'note', hint: 'cita quote >' },
  { type: 'callout', label: 'Destacado', icon: 'marker', hint: 'destacado idea clave aviso' },
  { type: 'code', label: 'Código', icon: 'code', hint: 'codigo code programa' },
  { type: 'table', label: 'Tabla', icon: 'table', hint: 'tabla table filas columnas' },
  { type: 'image', label: 'Foto', icon: 'img', hint: 'foto imagen image picture' },
  { type: 'divider', label: 'Divisor', icon: 'close', hint: 'divisor linea separador ---' },
]
const plain = (html) => String(html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const savedTheme = () => { try { return localStorage.getItem('codeTheme') || 'noche' } catch { return 'noche' } }
export const newBlock = (type = 'text', html = '') => ({
  id: crypto.randomUUID(), type, html,
  ...(type === 'todo' ? { checked: false } : {}),
  ...(type === 'table' ? { rows: [['', '', ''], ['', '', '']] } : {}),
  ...(type === 'image' ? { file: null } : {}),
  ...(type === 'code' ? { code: '', lang: 'JavaScript', theme: savedTheme() } : {}),
})

const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

/** Cualquier formato guardado (bloques, HTML de la versión anterior, bloques antiguos) → lista de bloques. */
export function toBlocks(value) {
  // los bloques de código antiguos guardaban el texto en `html`
  if (value?.blocks) return value.blocks.map((b) => (b.type === 'code' && b.code === undefined ? { ...b, code: plain(b.html), lang: 'Texto', theme: 'noche' } : b))
  if (Array.isArray(value)) { // apuntes antiguos: [{ type, text }]
    const out = value.filter((b) => b.type !== 'image' && b.text).flatMap((b) => {
      if (b.type === 'title') return [newBlock('h1', esc(b.text))]
      if (b.type === 'subtitle') return [newBlock('h2', esc(b.text))]
      if (b.type === 'list' || b.type === 'outline') return b.text.split('\n').filter(Boolean).map((l) => newBlock('bullet', esc(l.trim())))
      if (b.type === 'highlight') return [newBlock('callout', esc(b.text))]
      return [newBlock('text', esc(b.text))]
    })
    return out.length ? out : [newBlock()]
  }
  if (typeof value === 'string' && value.trim()) { // HTML del editor anterior
    const doc = new DOMParser().parseFromString(`<body>${sanitize(value)}</body>`, 'text/html')
    const out = []
    doc.body.childNodes.forEach((n) => {
      if (n.nodeType === 3) { if (n.textContent.trim()) out.push(newBlock('text', esc(n.textContent))); return }
      const tag = n.tagName
      if (tag === 'UL' || tag === 'OL') n.querySelectorAll('li').forEach((li) => out.push(newBlock(tag === 'OL' ? 'numbered' : 'bullet', li.innerHTML)))
      else if (tag === 'H1') out.push(newBlock('h1', n.innerHTML))
      else if (tag === 'H2') out.push(newBlock('h2', n.innerHTML))
      else if (tag === 'H3') out.push(newBlock('h3', n.innerHTML))
      else out.push(newBlock('text', n.innerHTML))
    })
    return out.length ? out : [newBlock()]
  }
  return [newBlock()]
}
export const toDoc = (blocks) => ({ v: 2, blocks })
