// Pasa un PDF entero a bloques editables: títulos, texto, listas, tablas e imágenes (las imágenes se recortan de la página).
// Todo ocurre en el navegador; las imágenes se guardan como archivos del documento (fileStore).
import { newBlock } from './docModel.js'
import { sanitize } from './richText.js'
import { saveFile } from './fileStore.js'
import { segmentsFromSpans } from './pdfSelection.js'

const SCALE = 2 // calidad de las imágenes recortadas
const MIN_IMG = 48 // lado mínimo (px de la página renderizada): lo más pequeño son adornos
const esc = (t) => sanitize(String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])))
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }

const blockOf = (p) => {
  if (p.type === 'code') return [{ ...newBlock('code'), code: p.code, ...(p.lang ? { lang: p.lang } : {}) }]
  if (p.type === 'table') return [{ ...newBlock('table'), rich: true, rows: p.rows.map((r) => r.map(esc)) }]
  if (p.items) return p.items.map((t) => newBlock(p.type, esc(t)))
  return [newBlock(p.type, esc(p.text))]
}

/** Rectángulos (en píxeles de la página renderizada) donde el PDF dibuja imágenes */
async function imageRects(pdfjs, page, vp) {
  const { OPS, Util } = pdfjs
  const ops = await page.getOperatorList()
  const rects = []
  let ctm = [1, 0, 0, 1, 0, 0]
  const stack = []
  const IMG = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintJpegXObject].filter((x) => x != null))
  ops.fnArray.forEach((fn, i) => {
    const args = ops.argsArray[i]
    if (fn === OPS.save) stack.push(ctm)
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm
    else if (fn === OPS.transform) ctm = Util.transform(ctm, args)
    else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm); if (args?.[0]) ctm = Util.transform(ctm, args[0]) }
    else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm
    else if (IMG.has(fn)) {
      const m = Util.transform(vp.transform, ctm) // la imagen ocupa el cuadrado unidad
      const xs = [0, 1, 0, 1].map((u, k) => m[0] * u + m[2] * [0, 0, 1, 1][k] + m[4])
      const ys = [0, 1, 0, 1].map((u, k) => m[1] * u + m[3] * [0, 0, 1, 1][k] + m[5])
      rects.push({ left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) })
    }
  })
  return rects.filter((r) => r.right - r.left >= MIN_IMG && r.bottom - r.top >= MIN_IMG)
}

const cropToFile = (canvas, r, name) => new Promise((resolve) => {
  const x = Math.max(0, Math.floor(r.left)); const y = Math.max(0, Math.floor(r.top))
  const w = Math.min(canvas.width - x, Math.ceil(r.right - r.left)); const h = Math.min(canvas.height - y, Math.ceil(r.bottom - r.top))
  if (w < MIN_IMG || h < MIN_IMG) { resolve(null); return }
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h)
  c.toBlob((b) => resolve(b ? new File([b], name, { type: 'image/png' }) : null), 'image/png')
})

/**
 * @param {File} file PDF
 * @param {(page:number,total:number)=>void} onProgress
 * @returns {Promise<{blocks:Array, pages:number, images:number}>}
 */
export async function pdfToBlocks(file, onProgress = () => {}, { maxPages = 120 } = {}) {
  const pdfjs = await import('pdfjs-dist')
  if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const total = Math.min(pdf.numPages, maxPages)
  const pages = []
  // 1) lo que hay en cada página: trozos de texto con su posición e imágenes
  for (let n = 1; n <= total; n++) {
    onProgress(n, total)
    const page = await pdf.getPage(n)
    const vp = page.getViewport({ scale: SCALE })
    const content = await page.getTextContent()
    const spans = content.items.filter((it) => it.str?.trim()).map((it) => {
      const [a, b, , , e, f] = it.transform
      const fs = Math.hypot(a, b) * SCALE
      const left = e * SCALE
      const top = vp.height - f * SCALE - fs
      return { text: it.str, left, right: left + it.width * SCALE, top, bottom: top + fs, fs, mono: /mono|courier|consolas|menlo|code|typewriter|fixed/i.test(content.styles?.[it.fontName]?.fontFamily ?? '') }
    })
    let rects = []
    try { rects = await imageRects(pdfjs, page, vp) } catch { /* sin imágenes */ }
    pages.push({ page, vp, spans, rects })
  }
  const body = median(pages.flatMap((p) => p.spans.map((s) => s.fs)))
  // imágenes que se repiten en muchas páginas (logos, cabeceras): se ignoran
  const sig = (r) => `${Math.round(r.left / 8)}-${Math.round(r.top / 8)}-${Math.round((r.right - r.left) / 8)}-${Math.round((r.bottom - r.top) / 8)}`
  const seen = new Map()
  pages.forEach((p) => new Set(p.rects.map(sig)).forEach((k) => seen.set(k, (seen.get(k) ?? 0) + 1)))
  const blocks = []
  let images = 0
  // 2) página a página, en orden de lectura: texto por tramos entre imágenes
  for (let n = 0; n < pages.length; n++) {
    onProgress(n + 1, total)
    const { page, vp, spans, rects: all } = pages[n]
    const rects = (total >= 4 ? all.filter((r) => seen.get(sig(r)) < 3) : all).sort((a, b) => a.top - b.top)
    const scanned = spans.map((s) => s.text).join('').length < 20 // página sin texto (escaneada): entera como imagen
    let canvas = null
    if (rects.length || scanned) {
      canvas = document.createElement('canvas'); canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    }
    if (scanned) {
      const f = await cropToFile(canvas, { left: 0, top: 0, right: canvas.width, bottom: canvas.height }, `pagina-${n + 1}.png`)
      if (f) { blocks.push({ ...newBlock('image'), file: await saveFile(f) }); images++ }
      continue
    }
    const inside = (s, r) => { const cx = (s.left + s.right) / 2; const cy = (s.top + s.bottom) / 2; return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom }
    const free = spans.filter((s) => !rects.some((r) => inside(s, r))) // el texto dentro de una imagen es de la imagen
    let from = -Infinity
    for (const r of rects) {
      const group = free.filter((s) => (s.top + s.bottom) / 2 > from && (s.top + s.bottom) / 2 <= r.top)
      segmentsFromSpans(group, body).forEach((p) => blocks.push(...blockOf(p)))
      const f = await cropToFile(canvas, r, `imagen-${n + 1}.png`)
      if (f) { blocks.push({ ...newBlock('image'), file: await saveFile(f) }); images++ }
      from = r.bottom
    }
    segmentsFromSpans(free.filter((s) => (s.top + s.bottom) / 2 > from), body).forEach((p) => blocks.push(...blockOf(p)))
  }
  return { blocks, pages: total, images }
}
