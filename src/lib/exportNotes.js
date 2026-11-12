// Exportar apuntes a PDF: se arma una hoja HTML con el estilo elegido y se imprime como PDF.
// Los bloques llevan «break-inside: avoid» para que no se corte nada entre páginas.
import { getFile } from './fileStore.js'

export const FONTS = { poppins: "'Poppins', sans-serif", lora: "'Lora', Georgia, serif", mono: "ui-monospace, Menlo, Consolas, monospace" }
export const COLORS = ['#2F6FED', '#E0457B', '#2FA36B', '#F29D38', '#8B5CF6', '#5F6368']
export const RADII = [0, 8, 16]
export const DEFAULT_STYLE = { font: 'poppins', color: '#2F6FED', radius: 16, stripes: true }

const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

/** CSS de la hoja (sirve igual para la vista previa y para el PDF). Ancho de contenido = A4 con márgenes de 20 mm. */
export function sheetCss(st) {
  const c = st.color
  const r = st.radius
  return `
.x-sheet { font-family: ${FONTS[st.font] ?? FONTS.poppins}; color: #202124; font-size: 13px; line-height: 1.65; --c: ${c}; --r: ${r}px; }
.x-sheet * { box-sizing: border-box; }
.x-sheet { overflow-wrap: anywhere; word-break: break-word; } /* ningún texto se sale de la hoja, ni sin espacios */
.x-head { font-size: 11px; color: #5F6368; display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.x-head i { width: 9px; height: 9px; border-radius: 50%; background: var(--c); display: inline-block; }
.x-b { break-inside: avoid; page-break-inside: avoid; margin: 0 0 10px; }
/* El texto sí puede continuar en la página siguiente; lo demás (tablas, código, fotos…) pasa entero */
.x-text, .x-li, .x-quote { break-inside: auto; page-break-inside: auto; orphans: 3; widows: 3; }
.x-pb { break-before: page; page-break-before: always; }
.x-h1 { font-size: 26px; font-weight: 700; line-height: 1.25; margin: 6px 0 10px; break-after: avoid; }
.x-h2 { font-size: 18px; font-weight: 700; color: var(--c); margin: 16px 0 6px; break-after: avoid; }
.x-h3 { font-size: 15px; font-weight: 700; margin: 12px 0 4px; break-after: avoid; }
.x-text { white-space: pre-wrap; }
.x-li { display: flex; gap: 8px; margin-bottom: 4px; } .x-li > span:first-child { flex: none; min-width: 18px; color: var(--c); font-weight: 700; }
.x-box { display: inline-block; width: 13px; height: 13px; margin-top: 4px; border: 1.8px solid var(--c); border-radius: ${Math.min(r, 5)}px; position: relative; flex: none; }
.x-box.on { background: var(--c); } .x-box.on::after { content: ''; position: absolute; left: 3px; top: 0; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.x-done { text-decoration: line-through; color: #80868B; }
.x-quote { border-left: 4px solid var(--c); padding: 4px 0 4px 14px; color: #3C4043; font-style: italic; }
.x-callout { background: color-mix(in srgb, var(--c) 12%, #fff); border-left: 4px solid var(--c); border-radius: ${Math.max(r - 2, 0)}px; padding: 10px 14px; }
.x-code { background: #0F172A; color: #E2E8F0; border-radius: ${Math.max(r - 2, 0)}px; padding: 12px 14px; font: 11.5px/1.55 ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; word-break: break-word; }
.x-lang { display: block; font: 600 10px Poppins, sans-serif; color: #94A3B8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .06em; }
.x-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; border: 1.5px solid color-mix(in srgb, var(--c) 35%, #fff); border-radius: var(--r); overflow: hidden; font-size: 12.5px; }
.x-table th { background: var(--c); color: #fff; text-align: left; font-weight: 600; padding: 8px 12px; }
.x-table td { padding: 8px 12px; white-space: pre-wrap; } .x-table th { white-space: pre-wrap; }
.x-table tr { break-inside: avoid; }
${st.stripes ? '.x-table tr:nth-child(even) td { background: color-mix(in srgb, var(--c) 7%, #fff); }' : ''}
.x-table td + td, .x-table th + th { border-left: 1px solid color-mix(in srgb, var(--c) 18%, #fff); }
.x-table tr + tr td { border-top: 1px solid color-mix(in srgb, var(--c) 18%, #fff); }
.x-img { max-width: 100%; max-height: 420px; border-radius: var(--r); display: block; margin: 0 auto; }
.x-hr { border: 0; border-top: 2px solid color-mix(in srgb, var(--c) 30%, #fff); margin: 14px 0; }
.x-sheet b, .x-sheet strong { font-weight: 700; } .x-sheet mark { background: #FFF3B0; }
.x-sheet ul, .x-sheet ol { margin: 0; padding-left: 20px; }`
}

/** Cada bloque → su HTML. `n` = número en una lista numerada; `imgs` = id de archivo → data URL. */
export function blockHtml(b, n, imgs) {
  const rich = (h) => h || ''
  switch (b.type) {
    case 'h1': case 'h2': case 'h3': return `<div class="x-b x-${b.type}">${rich(b.html)}</div>`
    case 'bullet': return `<div class="x-b x-li"><span>•</span><div>${rich(b.html)}</div></div>`
    case 'numbered': return `<div class="x-b x-li"><span>${n}.</span><div>${rich(b.html)}</div></div>`
    case 'todo': return `<div class="x-b x-li"><span class="x-box ${b.checked ? 'on' : ''}"></span><div class="${b.checked ? 'x-done' : ''}">${rich(b.html)}</div></div>`
    case 'quote': return `<div class="x-b x-quote">${rich(b.html)}</div>`
    case 'callout': return `<div class="x-b x-callout">${rich(b.html)}</div>`
    case 'code': return `<div class="x-b x-code">${b.lang ? `<span class="x-lang">${esc(b.lang)}</span>` : ''}${esc(b.code)}</div>`
    case 'table': {
      const rows = b.rows ?? []
      return `<div class="x-b"><table class="x-table">${rows.map((r, i) => `<tr>${r.map((c) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</table></div>`
    }
    case 'image': return imgs[b.file?.id] ? `<div class="x-b"><img class="x-img" src="${imgs[b.file.id]}" alt=""></div>` : ''
    case 'divider': return '<hr class="x-hr">'
    default: return `<div class="x-b x-text">${rich(b.html)}</div>`
  }
}

/** Cuerpo de la hoja: los bloques en su orden, con los saltos de página que hayas puesto. */
export function sheetHtml({ title, subtitle, blocks, breaks, imgs, dots = true }) {
  let n = 0
  const body = blocks.map((b, i) => {
    n = b.type === 'numbered' ? (blocks[i - 1]?.type === 'numbered' ? n + 1 : 1) : 0
    const h = blockHtml(b, n, imgs)
    return breaks.has(b.id) && i > 0 ? `<div class="x-pb">${h}</div>` : h
  }).join('')
  return `<div class="x-sheet"><div class="x-head">${dots ? '<i></i>' : ''}${esc(title)}${subtitle ? ` · ${esc(subtitle)}` : ''}</div>${body}</div>`
}

/** Fotos de los apuntes → data URL (para que salgan en el PDF). */
export async function loadImages(blocks) {
  const out = {}
  await Promise.all(blocks.filter((b) => b.type === 'image' && b.file?.id).map(async (b) => {
    try {
      const blob = await getFile(b.file.id)
      if (blob) out[b.file.id] = await new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(blob) })
    } catch { /* sin foto */ }
  }))
  return out
}

/** Imprime la hoja como PDF con el diálogo del navegador («Guardar como PDF»). */
export async function printSheet(html, st, title) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const d = frame.contentDocument
  d.open()
  d.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Lora:wght@400;700&display=swap" rel="stylesheet">
<style>@page { size: A4; margin: 20mm; } html, body { margin: 0; background: #fff; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } ${sheetCss(st)}</style></head><body>${html}</body></html>`)
  d.close()
  try { await Promise.race([d.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) } catch { /* sin fuentes */ }
  await new Promise((r) => setTimeout(r, 150))
  frame.contentWindow.focus()
  frame.contentWindow.print()
  setTimeout(() => frame.remove(), 60000)
}

// Alto útil de una página A4 con márgenes de 20 mm (a 96 dpi) y alto de línea del texto (13 px × 1,65)
export const PAGE = { w: 794, h: 1123, m: 76, content: 971 }
const LH = 21.45
const SPLITTABLE = ['text', 'bullet', 'numbered', 'todo', 'quote']

/**
 * Reparte una tira continua en páginas A4 como lo haría el PDF: el texto puede continuar en la página siguiente
 * (cortando entre líneas); tablas, código, fotos, destacados… pasan enteros; un título no se queda solo al final.
 * `items` = [{ top, bottom, type, force }] en orden. Devuelve [[desde, hasta], …] en px de la tira.
 */
export function paginate(items, total, H = PAGE.content) {
  const pages = []
  let start = 0
  for (let guard = 0; guard < 300; guard++) {
    let end = start + H
    if (end >= total - 0.5) { pages.push([start, Math.max(total, start + 1)]); break }
    const force = items.find((it) => it.force && it.top > start + 1 && it.top < end)
    if (force) end = force.top
    else {
      const cross = items.find((it) => it.top < end - 0.5 && it.bottom > end + 0.5)
      if (cross) {
        if (SPLITTABLE.includes(cross.type)) {
          const cut = cross.top + Math.floor((end - cross.top) / LH) * LH
          end = cut - cross.top >= 2 * LH && cut > start ? cut : (cross.top > start ? cross.top : cut > start ? cut : end)
        } else if (cross.top > start) end = cross.top
      }
      const last = items.filter((it) => it.bottom <= end + 0.5 && it.top >= start).pop()
      if (last && /^h[123]$/.test(last.type) && last.top > start && end - last.bottom < 30) end = last.top
    }
    if (end <= start + 1) end = start + H
    pages.push([start, end])
    const inside = items.find((it) => it.top < end - 0.5 && it.bottom > end + 0.5)
    const next = items.find((it) => it.top >= end - 0.5)
    start = inside ? end : next ? next.top : total
    if (start >= total - 0.5) break
  }
  return pages.length ? pages : [[0, Math.max(total, 1)]]
}
