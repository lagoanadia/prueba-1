// Modelo de los documentos (apuntes y soluciones): una lista de bloques estilo Notion.
// block = { id, type, html, checked? }  ·  `html` solo lleva formato permitido (negrita, cursiva…).
import { sanitize } from './richText.js'

/** Número de una lista numerada: sigue contando aunque haya entre medias código, viñetas, imágenes, etc. Se corta con texto normal o títulos. */
const PASS = ['bullet', 'todo', 'code', 'image', 'gallery', 'callout', 'table', 'quote', 'box', 'link']
export function numberAt(blocks, i) {
  let n = 1
  for (let k = i - 1; k >= 0; k--) {
    const t = blocks[k].type
    if (t === 'numbered') n++
    else if (!PASS.includes(t)) break
  }
  return n
}

export const BLOCK_TYPES = [
  { type: 'text', label: 'Texto', icon: 'note', tint: '#E8EAED', ink: '#5F6368', hint: 'texto normal parrafo' },
  { type: 'h1', label: 'Título 1', icon: 'title', tint: '#DDEBFF', ink: '#2F6FED', glyph: 'H1', hint: 'titulo grande h1 #' },
  { type: 'h2', label: 'Título 2', icon: 'title', tint: '#DDEBFF', ink: '#2F6FED', glyph: 'H2', hint: 'titulo mediano h2 ##' },
  { type: 'h3', label: 'Título 3', icon: 'title', tint: '#DDEBFF', ink: '#2F6FED', glyph: 'H3', hint: 'titulo pequeño h3 ###' },
  { type: 'h4', label: 'Título 4', icon: 'title', tint: '#DDEBFF', ink: '#2F6FED', glyph: 'H4', hint: 'titulo mini h4 ####' },
  { type: 'bullet', label: 'Lista con puntos', icon: 'list', tint: '#DFF5E4', ink: '#1FA463', hint: 'lista puntos viñetas -' },
  { type: 'numbered', label: 'Lista numerada', icon: 'list', tint: '#DFF5E4', ink: '#1FA463', hint: 'lista numerada 1.' },
  { type: 'todo', label: 'Tareas', icon: 'check', tint: '#DFF5E4', ink: '#1FA463', hint: 'tareas casillas checklist []' },
  { type: 'quote', label: 'Cita', icon: 'chat', tint: '#FCE0EA', ink: '#E8618C', hint: 'cita quote >' },
  { type: 'callout', label: 'Destacado', icon: 'marker', tint: '#FFF1B8', ink: '#B58900', hint: 'destacado idea clave aviso' },
  { type: 'box', label: 'Post-it', icon: 'doc', tint: '#FFE2C2', ink: '#F08A24', hint: 'postit post-it recuadro caja nota contenedor amarillo' },
  { type: 'code', label: 'Código', icon: 'code', tint: '#E9DDFA', ink: '#7C4DDB', hint: 'codigo code programa' },
  { type: 'table', label: 'Tabla', icon: 'table', tint: '#E9DDFA', ink: '#7C4DDB', hint: 'tabla table filas columnas' },
  { type: 'image', label: 'Foto', icon: 'img', tint: '#FCE0EA', ink: '#E8618C', hint: 'foto imagen image picture' },
  { type: 'gallery', label: 'Galería', icon: 'img', tint: '#FCE0EA', ink: '#E8618C', hint: 'galeria fotos imagenes varias collage mosaico' },
  { type: 'link', label: 'Enlace', icon: 'link', tint: '#DDEBFF', ink: '#2F6FED', hint: 'enlace link url web pagina' },
  { type: 'divider', label: 'Divisor', icon: 'minus', tint: '#E8EAED', ink: '#5F6368', hint: 'divisor linea separador ---' },
]
/** Colores del Post-it: barra (más fuerte) y fondo (suave) */
export const POSTIT_COLORS = {
  amarillo: { label: 'Amarillo', bar: '#F2B705', bg: '#FFF1B8' },
  naranja: { label: 'Naranja', bar: '#F08A24', bg: '#FFE2C2' },
  rosa: { label: 'Rosa', bar: '#E8618C', bg: '#FCDCE7' },
  azul: { label: 'Azul', bar: '#4A90E2', bg: '#DCEBFF' },
  verde: { label: 'Verde', bar: '#3FBF6B', bg: '#D9F4E2' },
  morado: { label: 'Morado', bar: '#9B6BDF', bg: '#E9DDFA' },
}
const plain = (html) => String(html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const savedTheme = () => { try { return localStorage.getItem('codeTheme') || 'noche' } catch { return 'noche' } }
export const newBlock = (type = 'text', html = '') => ({
  id: crypto.randomUUID(), type, html,
  ...(type === 'todo' ? { checked: false } : {}),
  ...(type === 'box' ? { blocks: [newBlock()] } : {}),
  ...(type === 'table' ? { rows: [['', '', ''], ['', '', '']] } : {}),
  ...(type === 'image' ? { file: null } : {}),
  ...(type === 'gallery' ? { files: [], layout: 'row' } : {}),
  ...(type === 'link' ? { url: '', title: '' } : {}),
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
      else if (tag === 'H4') out.push(newBlock('h4', n.innerHTML))
      else out.push(newBlock('text', n.innerHTML))
    })
    return out.length ? out : [newBlock()]
  }
  return [newBlock()]
}
export const toDoc = (blocks) => ({ v: 2, blocks })
