// Pegar desde fuera: lo copiado (una web, Word, Google Docs, Excel…) se convierte en bloques de la app:
// tablas → tabla, listas → listas, títulos → títulos, citas, código, divisores y párrafos con negrita/cursiva/subrayado.
import { sanitize } from './richText.js'

const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const SKIP = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'IMG', 'SVG', 'IFRAME', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'])
const BLOCKY = new Set(['P', 'DIV', 'UL', 'OL', 'LI', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'HR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'FIGURE', 'FIGCAPTION', 'DL', 'DT', 'DD', 'TR', 'TBODY', 'THEAD', 'TFOOT', 'CENTER'])

/** Contenido en línea de un nodo: solo negrita, cursiva, subrayado y saltos; lo demás se queda como texto */
function inline(node) {
  let out = ''
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out += esc(n.textContent.replace(/\s+/g, ' ')); return }
    if (n.nodeType !== 1 || SKIP.has(n.tagName)) return
    const inner = inline(n)
    const st = (n.getAttribute('style') || '').toLowerCase()
    const bold = n.tagName === 'B' || n.tagName === 'STRONG' || /font-weight:\s*(bold|[6-9]00)/.test(st)
    const ital = n.tagName === 'I' || n.tagName === 'EM' || /font-style:\s*italic/.test(st)
    const und = n.tagName === 'U' || /text-decoration[^;]*underline/.test(st)
    if (n.tagName === 'BR') { out += '<br>'; return }
    let h = inner
    if (!h.trim()) { out += h; return }
    if (bold && !(n.tagName === 'B' && /font-weight:\s*normal/.test(st))) h = `<b>${h}</b>`
    if (ital) h = `<i>${h}</i>`
    if (und && n.tagName !== 'A') h = `<u>${h}</u>`
    out += h
  })
  return out
}
const clean = (h) => sanitize(h).replace(/^(\s|<br>)+|(\s|<br>)+$/g, '').trim()
const plainOf = (n) => (n.textContent || '').replace(/ /g, ' ').trim()

function tableOf(t, extra = []) {
  // varias tablas pegadas seguidas (cabecera y cuerpo por separado) se unen en una
  const trs = [t, ...extra].flatMap((tb) => [...tb.querySelectorAll('tr')].filter((tr) => tr.closest('table') === tb))
  const rows = trs.map((tr) => {
    const cells = [...tr.children].filter((c) => c.tagName === 'TD' || c.tagName === 'TH')
    return { rowHead: cells[0]?.tagName === 'TH' && cells.length > 1, cells: cells.flatMap((c) => {
      const span = Math.min(Number(c.getAttribute('colspan')) || 1, 6)
      const h = clean(inline(c).replace(/(<br>\s*)+$/g, ''))
      return [h, ...Array(span - 1).fill('')]
    }) }
  }).filter((r) => r.cells.length)
  if (!rows.length) return null
  const cols = Math.max(...rows.map((r) => r.cells.length))
  // una celda vacía al principio de la cabecera que se ha perdido al copiar: se rellena por la izquierda (no por la derecha)
  const bodyHead = rows.slice(1).some((r) => r.cells.length === cols && r.rowHead)
  const fix = (r, i) => {
    const gap = cols - r.cells.length
    if (!gap) return r.cells
    return i === 0 && bodyHead ? [...Array(gap).fill(''), ...r.cells] : [...r.cells, ...Array(gap).fill('')]
  }
  return { type: 'table', rows: rows.map(fix) }
}

function walk(node, out, para) {
  const flush = () => { const h = clean(para.h); if (h) out.push({ type: 'text', html: h }); para.h = '' }
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { para.h += esc(n.textContent.replace(/\s+/g, ' ')); return }
    if (n.nodeType !== 1 || SKIP.has(n.tagName)) return
    const tag = n.tagName
    if (/^H[1-6]$/.test(tag)) { flush(); const h = clean(inline(n)); if (h) out.push({ type: `h${Math.min(Number(tag[1]), 3)}`, html: h }); return }
    if (tag === 'TABLE') {
      flush()
      if (n.dataset.merged) return
      // tablas hermanas contiguas se unen en una
      const extra = []
      for (let nx = n.nextElementSibling; nx && nx.tagName === 'TABLE'; nx = nx.nextElementSibling) { extra.push(nx); nx.dataset.merged = '1' }
      const t = tableOf(n, extra); if (t) out.push(t); return
    }
    if (tag === 'UL' || tag === 'OL') {
      flush()
      const kind = tag === 'OL' ? 'numbered' : 'bullet'
      const items = (ul) => [...ul.children].forEach((li) => {
        if (li.tagName !== 'LI') return
        const copy = li.cloneNode(true)
        copy.querySelectorAll('ul, ol').forEach((x) => x.remove())
        const h = clean(inline(copy))
        if (h) out.push({ type: kind, html: h })
        li.querySelectorAll(':scope > ul, :scope > ol').forEach((sub) => items(sub)) // las listas dentro de listas se aplanan
      })
      items(n)
      return
    }
    if (tag === 'BLOCKQUOTE') { flush(); const h = clean(inline(n)); if (h) out.push({ type: 'quote', html: h }); return }
    if (tag === 'PRE') { flush(); const code = (n.textContent || '').replace(/\n+$/, ''); if (code.trim()) out.push({ type: 'code', code }); return }
    if (tag === 'HR') { flush(); out.push({ type: 'divider' }); return }
    if (tag === 'BR') { para.h += '<br>'; return }
    if (BLOCKY.has(tag)) {
      // un contenedor con bloques dentro se recorre; uno con solo texto en línea es un párrafo
      const hasBlock = [...n.querySelectorAll('*')].some((c) => ['TABLE', 'UL', 'OL', 'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'HR'].includes(c.tagName))
      flush()
      if (hasBlock) walk(n, out, { h: '' })
      else { const h = clean(inline(n)); if (h) out.push({ type: 'text', html: h }) }
      return
    }
    // en línea suelto (b, span, a…)
    if (n.querySelector('table, ul, ol, h1, h2, h3, h4, h5, h6, p, div, pre, blockquote')) { flush(); walk(n, out, { h: '' }); return }
    para.h += inline({ childNodes: [n] })
  })
  flush()
}

function fromText(text) {
  const t = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '')
  const lines = t.split('\n')
  if (lines.length < 2) return null
  // Excel / hojas de cálculo: columnas separadas por tabuladores
  const tabbed = lines.filter((l) => l.includes('\t'))
  if (tabbed.length >= 2 && tabbed.length >= lines.length * 0.7) {
    const rows = lines.filter((l) => l.trim()).map((l) => l.split('\t').map((c) => esc(c.trim())))
    const cols = Math.max(...rows.map((r) => r.length))
    return [{ type: 'table', rows: rows.map((r) => [...r, ...Array(cols - r.length).fill('')]) }]
  }
  const out = []
  for (const raw of lines) {
    const l = raw.replace(/\s+$/, '')
    if (!l.trim()) continue
    let m
    if ((m = l.match(/^\s*#{1,3}\s+(.*)$/))) out.push({ type: `h${Math.min((l.trim().match(/^#+/)[0].length), 3)}`, html: esc(m[1]) })
    else if ((m = l.match(/^\s*[-*•·▪◦]\s+(.*)$/))) out.push({ type: 'bullet', html: esc(m[1]) })
    else if ((m = l.match(/^\s*\(?\d{1,3}[.)]\s+(.*)$/))) out.push({ type: 'numbered', html: esc(m[1]) })
    else if ((m = l.match(/^\s*>\s+(.*)$/))) out.push({ type: 'quote', html: esc(m[1]) })
    else out.push({ type: 'text', html: esc(l.trim()) })
  }
  return out
}

/**
 * Lo copiado → lista de bloques { type, html? | rows? | code? }, o null si es un trozo de texto normal (se pega como siempre).
 */
export function blocksFromPaste(html, text) {
  if (html && /<(table|ul|ol|h[1-6]|pre|blockquote|hr|p|div)\b/i.test(html)) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const out = []
    walk(doc.body, out, { h: '' })
    // una tabla de una sola fila (la cabecera) seguida de otra: son una sola tabla; la columna que falta en la cabecera (esquina vacía) se crea por la izquierda
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i], b = out[i + 1]
      if (a.type !== 'table' || b.type !== 'table' || a.rows.length !== 1) continue
      const cols = Math.max(a.rows[0].length, b.rows[0].length)
      const head = [...Array(cols - a.rows[0].length).fill(''), ...a.rows[0]]
      out.splice(i, 2, { type: 'table', rows: [head, ...b.rows.map((r) => [...r, ...Array(cols - r.length).fill('')])] })
    }
    if (out.length === 1 && out[0].type === 'text') return out // un solo párrafo: se pega en línea (con su formato)
    if (out.length) return out
  }
  return text ? fromText(text) : null
}
