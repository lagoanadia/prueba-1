// Qué es lo que se ha seleccionado en el PDF: título, lista, tabla o texto. Se deduce del tamaño de la letra,
// de las viñetas/números del principio de línea y de cómo se alinean los trozos de texto en columnas.

const BULLET = /^\s*[•·●▪◦‣∙*–—-]\s+/
const NUMBERED = /^\s*\(?\d{1,3}[.)]\s+/
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }

/** Trozos de texto del PDF que toca la selección, con su posición y el tamaño de letra. */
function selectedSpans(root, sel) {
  const all = [...root.querySelectorAll('.textLayer span')].filter((s) => s.textContent.trim() && !s.classList.contains('markedContent'))
  const mine = all.filter((s) => { try { return sel.containsNode(s, true) } catch { return false } })
  const measure = (s) => { const r = s.getBoundingClientRect(); return { text: s.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, fs: parseFloat(getComputedStyle(s).fontSize) || r.height } }
  return { mine: mine.map(measure), body: median(all.map((s) => parseFloat(getComputedStyle(s).fontSize) || 0).filter(Boolean)) }
}

/** Agrupa los trozos en líneas (misma altura) y cada línea en celdas (separadas por un hueco ancho). */
function toLines(spans) {
  const sorted = [...spans].sort((a, b) => a.top - b.top || a.left - b.left)
  const lines = []
  for (const s of sorted) {
    const mid = (s.top + s.bottom) / 2
    const line = lines.find((l) => Math.abs(l.mid - mid) < s.fs * 0.5)
    if (line) line.spans.push(s); else lines.push({ mid, spans: [s], fs: s.fs })
  }
  return lines.sort((a, b) => a.mid - b.mid).map((l) => {
    const sp = l.spans.sort((a, b) => a.left - b.left)
    const cells = []
    for (const s of sp) {
      const last = cells[cells.length - 1]
      if (last && s.left - last.right < s.fs * 0.9) { last.text += (s.left - last.right > s.fs * 0.15 && !/\s$/.test(last.text) ? ' ' : '') + s.text; last.right = s.right } else cells.push({ text: s.text, left: s.left, right: s.right })
    }
    return { mid: l.mid, text: cells.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim(), cells: cells.map((c) => ({ ...c, text: c.text.replace(/\s+/g, ' ').trim() })), fs: l.fs }
  })
}

const levelOf = (ratio) => (ratio >= 1.6 ? 'h1' : ratio >= 1.3 ? 'h2' : 'h3')

/**
 * Parte lo seleccionado en trozos, cada uno con su tipo: títulos (letra más grande), listas (viñetas),
 * tablas (columnas) y párrafos (el resto, separados por los huecos entre líneas).
 */
function segment(lines, body) {
  const out = []
  const ratio = (l) => (body ? l.fs / body : 1)
  const isHead = (l) => ratio(l) >= 1.12 && l.text.length <= 140
  const isItem = (l) => BULLET.test(l.text) || NUMBERED.test(l.text)
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (isHead(l)) { // línea(s) de título seguidas con el mismo tamaño
      let j = i + 1
      while (j < lines.length && isHead(lines[j]) && Math.abs(lines[j].fs - l.fs) < l.fs * 0.1) j++
      out.push({ type: levelOf(ratio(l)), text: lines.slice(i, j).map((x) => x.text).join(' ') })
      i = j
    } else if (isItem(l)) { // lista: cada viñeta es un punto y las líneas sin viñeta continúan el anterior
      let j = i
      const items = []
      while (j < lines.length && !isHead(lines[j]) && (isItem(lines[j]) || (items.length && lines[j].cells.length < 2))) {
        const clean = lines[j].text.replace(BULLET, '').replace(NUMBERED, '')
        if (isItem(lines[j])) items.push(clean); else items[items.length - 1] += ` ${clean}`
        j++
      }
      out.push({ type: lines.slice(i, j).filter((x) => NUMBERED.test(x.text)).length > items.length / 2 ? 'numbered' : 'bullet', items })
      i = j
    } else if (l.cells.length >= 2 && lines[i + 1]?.cells.length >= 2) { // tabla: líneas seguidas con varias columnas
      let j = i
      while (j < lines.length && lines[j].cells.length >= 2 && !isHead(lines[j])) j++
      const slice = lines.slice(i, j)
      const cols = slice.map((x) => x.cells.length).sort((a, b) => a - b)[Math.floor(slice.length / 2)]
      out.push({ type: 'table', rows: slice.map((x) => Array.from({ length: cols }, (_, k) => x.cells[k]?.text ?? '')) })
      i = j
    } else { // párrafo: hasta un título, una viñeta, una tabla o un hueco grande
      let j = i + 1
      let maxLen = l.text.length
      // Un párrafo acaba también cuando una línea corta termina en punto: lo siguiente es otra cosa
      const endsHere = (k) => /[.!?:]$/.test(lines[k].text) && lines[k].text.length < maxLen * 0.75
      while (j < lines.length && !isHead(lines[j]) && !isItem(lines[j]) && !(lines[j].cells.length >= 2 && lines[j + 1]?.cells.length >= 2) && lines[j].mid - lines[j - 1].mid < lines[j].fs * 1.9 && !endsHere(j - 1)) { maxLen = Math.max(maxLen, lines[j].text.length); j++ }
      const run = lines.slice(i, j)
      const short = run.length >= 3 && run.every((x) => x.text.length <= 80) && run.every((x) => Math.abs(x.cells[0].left - run[0].cells[0].left) < x.fs * 0.5)
      if (short) out.push({ type: 'bullet', items: run.map((x) => x.text) }) // líneas cortas alineadas: viñetas dibujadas, sin texto
      else out.push({ type: 'text', text: run.map((x) => x.text).join(' ') })
      i = j
    }
  }
  return out
}

/** Devuelve { lines, kind, ratio, segments } con `kind` = lo más probable en conjunto: text | title | list | table. */
export function classifySelection(root, sel) {
  const { mine, body } = selectedSpans(root, sel)
  if (!mine.length) return null
  const lines = toLines(mine)
  const segments = segment(lines, body)
  const fs = median(lines.map((l) => l.fs))
  const ratio = body ? fs / body : 1
  const textAll = lines.map((l) => l.text).join(' ')
  let kind = 'text'
  // Tabla: varias líneas con 2 o más celdas, casi todas con el mismo número
  const counts = lines.map((l) => l.cells.length)
  const mode = counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)]
  if (lines.length >= 2 && mode >= 2 && lines.filter((l) => l.cells.length === mode).length >= Math.ceil(lines.length * 0.7)) kind = 'table'
  else if (lines.length >= 2 && lines.filter((l) => BULLET.test(l.text) || NUMBERED.test(l.text)).length >= Math.ceil(lines.length * 0.6)) kind = 'list'
  else if (lines.length >= 3 && lines.every((l) => l.text.length <= 80) && lines.every((l) => Math.abs(l.cells[0].left - lines[0].cells[0].left) < l.fs * 0.5)) kind = 'list' // líneas cortas alineadas a la izquierda (viñetas dibujadas, sin texto)
  else if (lines.length <= 3 && textAll.length <= 140 && ratio >= 1.12) kind = 'title'
  return { lines, kind, ratio, mode, segments }
}

/** Lo que se pega en los apuntes según el tipo elegido. */
export function toPayload(info, type) {
  const lines = info.lines
  if (type === 'title') {
    const level = info.ratio >= 1.6 ? 'h1' : info.ratio >= 1.3 ? 'h2' : 'h3'
    return { type: level, text: lines.map((l) => l.text).join(' ') }
  }
  if (type === 'list') {
    const numbered = lines.filter((l) => NUMBERED.test(l.text)).length > lines.length / 2
    const anyMarked = lines.some((l) => BULLET.test(l.text) || NUMBERED.test(l.text))
    const items = []
    for (const l of lines) {
      const marked = BULLET.test(l.text) || NUMBERED.test(l.text)
      const clean = l.text.replace(BULLET, '').replace(NUMBERED, '')
      if (marked || !items.length || !anyMarked) items.push(clean); else items[items.length - 1] += ` ${clean}` // línea que continúa el punto anterior
    }
    return { type: numbered ? 'numbered' : 'bullet', items }
  }
  if (type === 'table') {
    const cols = Math.max(1, info.mode || Math.max(...lines.map((l) => l.cells.length)))
    return { type: 'table', rows: lines.map((l) => Array.from({ length: cols }, (_, i) => l.cells[i]?.text ?? '')) }
  }
  return { type: 'text', text: lines.map((l) => l.text).join(' ') }
}

/** Lo que se pega con el modo «auto»: una lista de bloques, cada uno con su tipo. */
export const autoPayload = (info) => info.segments
export const SEGMENT_LABEL = { h1: 'Título', h2: 'Título', h3: 'Título', text: 'Texto', bullet: 'Lista', numbered: 'Lista', table: 'Tabla' }
