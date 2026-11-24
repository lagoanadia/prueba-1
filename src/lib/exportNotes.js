// Exportar apuntes a PDF: se arma una hoja HTML con el estilo elegido y se imprime como PDF.
// Los bloques llevan «break-inside: avoid» para que no se corte nada entre páginas.
import { getFile } from './fileStore.js'
import { POSTIT_COLORS } from './docModel.js'

export const FONTS = { poppins: "'Poppins', sans-serif", lora: "'Lora', Georgia, serif", mono: "ui-monospace, Menlo, Consolas, monospace" }
export const COLORS = ['#2F6FED', '#E0457B', '#2FA36B', '#F29D38', '#8B5CF6', '#5F6368']
export const RADII = [0, 8, 16]
/** El código dentro de una línea toma el color de exportación elegido (también al escribir en el documento) */
export const syncCodeColor = (color) => { try { document.documentElement.style.setProperty('--code-c', color) } catch { /* sin documento */ } }
export const DEFAULT_STYLE = { font: 'poppins', color: '#2F6FED', radius: 16, stripes: true }

const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

/** Portada: estilo A (limpia), B (bloque de color) o C (raya lateral). `index` = índice en la hoja 2. */
export const DEFAULT_COVER = { on: false, style: 'A', title: '', subtitle: '', author: '', course: '', date: '', index: true }
export const COVER_H = 955 // alto de una portada / del índice (una hoja A4 sin los márgenes)

/** Portada como HTML (cabe en una hoja; el PDF salta de página al acabar). */
export function coverHtml(cv, docTitle, kicker) {
  const meta = [cv.author, cv.course, cv.date].filter((x) => x && x.trim()).map((x) => `<span>${esc(x)}</span>`).join('')
  const title = esc(cv.title || docTitle)
  const sub = cv.subtitle ? `<span class="x-cv-sub">${esc(cv.subtitle)}</span>` : ''
  const k = kicker ? `<small class="x-cv-k">${esc(kicker)}</small>` : ''
  const st = ['A', 'B', 'C'].includes(cv.style) ? cv.style : 'A'
  if (st === 'B') return `<div class="x-cover x-cover-B"><div class="x-cv-top">${k}<b class="x-cv-title">${title}</b></div><div class="x-cv-under">${sub}</div><div class="x-cv-meta">${meta}</div></div>`
  if (st === 'C') return `<div class="x-cover x-cover-C"><i class="x-cv-bar"></i><i class="x-cv-c1"></i><i class="x-cv-c2"></i><div class="x-cv-mid">${k}<b class="x-cv-title">${title}</b>${sub}</div><div class="x-cv-meta">${meta}</div></div>`
  return `<div class="x-cover x-cover-A"><div class="x-cv-mid"><i class="x-cv-rule"></i><b class="x-cv-title">${title}</b>${sub}</div><div class="x-cv-meta">${meta}</div></div>`
}

const plainTxt = (h) => String(h ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\u200B/g, '').trim()

/** Títulos del documento para el índice (nivel 1, 2 o 3). */
export const headingsOf = (blocks) => blocks.filter((b) => /^h[123]$/.test(b.type) && plainTxt(b.html)).map((b) => ({ id: b.id, level: Number(b.type[1]), text: plainTxt(b.html) }))

/** Cómo repartir el índice para que quepa en UNA hoja: primero se achica la letra, luego se quitan los títulos pequeños y, al final, se usan dos columnas. */
export function indexLayout(entries) {
  const H = 780
  const height = (list, s, cols) => (list.reduce((n, e) => n + Math.max(1, Math.ceil(e.text.length / ((cols === 2 ? 30 : 62) / s))) * (e.level === 1 ? 23 : 19.5) * s + (e.level === 1 ? 9 : 3.5) * s, 0)) / cols
  const tries = [[3, 1, 1], [3, 0.9, 1], [3, 0.8, 1], [2, 1, 1], [2, 0.9, 1], [2, 0.8, 1], [3, 0.7, 2], [3, 0.62, 2], [2, 0.7, 2], [2, 0.62, 2]]
  for (const [lv, sc, cols] of tries) { const list = entries.filter((e) => e.level <= lv); if (height(list, sc, cols) <= H) return { list, scale: sc, cols, cut: lv < 3 && entries.some((e) => e.level > lv) } }
  return { list: entries.filter((e) => e.level === 1), scale: 0.7, cols: 1, cut: true }
}

/** Índice (hoja 2): títulos con su sangría y el número de hoja (con puntos hasta él). */
export function indexHtml(blocks, pageNums = {}) {
  const lay = indexLayout(headingsOf(blocks))
  const rows = lay.list.map((e) => `<div class="x-ix x-ix-${e.level}"><span>${esc(e.text)}</span><i></i><b>${pageNums[e.id] ?? ''}</b></div>`).join('')
  return `<div class="x-index" style="--s:${lay.scale}"><div class="x-ix-h">Índice</div><div class="x-ix-list" style="column-count:${lay.cols}">${rows || '<p class="x-ix-empty">Añade títulos al documento y saldrán aquí.</p>'}</div></div>`
}

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
.x-b code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .88em; background: #EEF0F2; color: var(--c); border-radius: 4px; padding: 1px 6px; }
.x-postit .x-b code { background: rgba(255, 255, 255, .6); }
/* Portada e índice: una hoja cada uno */
.x-cover, .x-index { height: ${COVER_H}px; position: relative; overflow: hidden; break-after: page; page-break-after: always; }
.x-cv-title { display: block; font-size: 44px; line-height: 1.15; font-weight: 700; letter-spacing: -.01em; }
.x-cv-sub { display: block; font-size: 17px; color: #5F6368; margin-top: 14px; line-height: 1.4; }
.x-cv-k { display: block; font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 10px; }
.x-cv-meta { position: absolute; bottom: 64px; left: 0; right: 0; display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: #5F6368; line-height: 1.6; }
.x-cover-A .x-cv-mid { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-58%); text-align: center; padding: 0 36px; }
.x-cover-A .x-cv-rule { display: block; width: 56px; height: 5px; border-radius: 3px; background: var(--c); margin: 0 auto 26px; }
.x-cover-A .x-cv-meta { align-items: center; }
.x-cover-B .x-cv-top { height: 570px; background: var(--c); color: #FFFFFF; padding: 70px 56px; display: flex; flex-direction: column; justify-content: flex-end; border-bottom-right-radius: 170px; }
.x-cover-B .x-cv-k { opacity: .85; }
.x-cover-B .x-cv-under { padding: 34px 56px 0; } .x-cover-B .x-cv-under .x-cv-sub { margin-top: 0; }
.x-cover-B .x-cv-meta { left: 56px; }
.x-cover-C .x-cv-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 38px; background: var(--c); }
.x-cover-C .x-cv-c1 { position: absolute; right: -90px; top: -90px; width: 380px; height: 380px; border-radius: 50%; background: color-mix(in srgb, var(--c) 14%, #FFFFFF); }
.x-cover-C .x-cv-c2 { position: absolute; right: 70px; top: 150px; width: 110px; height: 110px; border-radius: 50%; background: color-mix(in srgb, var(--c) 30%, #FFFFFF); }
.x-cover-C .x-cv-mid { position: absolute; left: 92px; right: 40px; top: 400px; }
.x-cover-C .x-cv-k { color: var(--c); }
.x-cover-C .x-cv-meta { left: 92px; }
.x-index { padding: 46px 12px 0; }
.x-ix-h { font-size: 30px; font-weight: 700; color: var(--c); margin-bottom: 26px; }
.x-ix-list { column-gap: 34px; }
.x-ix { display: flex; align-items: baseline; gap: 8px; break-inside: avoid; font-size: calc(var(--s, 1) * 14px); line-height: 1.35; margin-bottom: calc(var(--s, 1) * 4px); }
.x-ix span { max-width: 88%; } .x-ix i { flex: 1; min-width: 12px; border-bottom: 1.5px dotted #BDC1C6; transform: translateY(-3px); } .x-ix b { font-weight: 600; color: #5F6368; min-width: 18px; text-align: right; }
.x-ix-1 { font-weight: 600; margin-top: calc(var(--s, 1) * 9px); } .x-ix-1:first-child { margin-top: 0; }
.x-ix-2 { padding-left: calc(var(--s, 1) * 20px); font-size: calc(var(--s, 1) * 13px); }
.x-ix-3 { padding-left: calc(var(--s, 1) * 40px); font-size: calc(var(--s, 1) * 12px); color: #3C4043; }
.x-ix-empty { color: #9AA0A6; }
.x-b { break-inside: avoid; page-break-inside: avoid; margin: 0 0 10px; }
/* Las tablas largas pueden seguir en la hoja siguiente (entre filas) en vez de dejar un hueco enorme */
.x-b.x-split { break-inside: auto; page-break-inside: auto; } .x-table tr { break-inside: avoid; page-break-inside: avoid; }
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
.x-postit { background: var(--pf, #FFF1B8); border-left: 5px solid var(--pb, #F2B705); border-radius: 4px 12px 12px 4px; padding: 12px 16px 4px; break-inside: auto; page-break-inside: auto; -webkit-box-decoration-break: clone; box-decoration-break: clone; } /* si se corta, cada trozo queda como un Post-it cerrado */
.x-postit .x-b:last-child { margin-bottom: 8px; }
.x-postit .x-table { border-color: var(--pb, #F2B705); background: transparent; }
.x-postit .x-table th { background: var(--pb, #F2B705); color: #202124; }
.x-postit .x-table td { background: transparent !important; }
.x-postit .x-table th + th { border-left-color: var(--pf, #FFF1B8); }
.x-postit .x-table td + td { border-left-color: var(--pb, #F2B705); }
.x-postit .x-table tr + tr td { border-top-color: var(--pb, #F2B705); }
/* El Post-it va por libre: no le afectan el color ni el redondeo que eliges para la hoja */
.x-postit .x-table { border-radius: 12px; }
.x-postit .x-callout { background: #FDF5CE; border-left-color: #F2B705; border-radius: 12px; }
.x-postit .x-h2 { color: #202124; }
.x-postit .x-li > span:first-child { color: var(--pb, #F2B705); }
.x-postit .x-quote { border-left-color: var(--pb, #F2B705); }
.x-postit .x-box { border-color: var(--pb, #F2B705); border-radius: 4px; } .x-postit .x-box.on { background: var(--pb, #F2B705); }
.x-postit .x-code, .x-postit .x-img, .x-postit .x-link { border-radius: 12px; } .x-postit .x-link { border-color: var(--pb, #F2B705); } .x-postit .x-link a { color: #202124; }
.x-callout { background: color-mix(in srgb, var(--c) 12%, #fff); border-left: 4px solid var(--c); border-radius: ${Math.max(r - 2, 0)}px; padding: 10px 14px; }
.x-code .x-cl, .x-code .x-cm { display: block; }
.x-code .x-cm { margin: 0 -14px; padding: 0 11px 0 11px; border-left: 3px solid var(--m); background: color-mix(in srgb, var(--m) 28%, transparent); }
.x-code { background: #0F172A; color: #E2E8F0; border-radius: ${Math.max(r - 2, 0)}px; padding: 12px 14px; font: 11.5px/1.55 ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; word-break: break-word; }
.x-lang { display: block; font: 600 10px Poppins, sans-serif; color: #94A3B8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .06em; }
.x-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; border: 1.5px solid color-mix(in srgb, var(--c) 35%, #fff); border-radius: var(--r); overflow: hidden; font-size: 12.5px; }
.x-table th { background: var(--c); color: #fff; text-align: left; font-weight: 600; padding: 8px 12px; }
.x-table td { padding: 8px 12px; white-space: pre-wrap; } .x-table th { white-space: pre-wrap; }
.x-table tr { break-inside: avoid; }
${st.stripes ? '.x-table tr:nth-child(even) td { background: color-mix(in srgb, var(--c) 7%, #fff); }' : ''}
.x-table td + td, .x-table th + th { border-left: 1px solid color-mix(in srgb, var(--c) 18%, #fff); }
.x-table tr + tr td { border-top: 1px solid color-mix(in srgb, var(--c) 18%, #fff); }
.x-gal { display: grid; gap: 6px; } .x-gal img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--r); display: block; }
.x-gal-row { grid-auto-flow: column; grid-auto-columns: 1fr; grid-template-rows: 160px; }
.x-gal-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 120px; }
.x-gal-mosaic { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 110px; } .x-gal-mosaic img:first-child { grid-column: span 2; grid-row: span 2; }
.x-img { max-width: 100%; max-height: 420px; border-radius: var(--r); display: block; margin: 0 auto; }
.x-link { border: 1.5px solid color-mix(in srgb, var(--c) 35%, #fff); border-radius: var(--r); padding: 8px 14px; } .x-link a { color: var(--c); font-weight: 600; text-decoration: none; } .x-link span { display: block; font-size: 11px; color: #5F6368; }
.x-hr { border: 0; border-top: 2px solid color-mix(in srgb, var(--c) 30%, #fff); margin: 14px 0; }
.x-sheet span[data-hl] { background: linear-gradient(104deg, transparent 0.4%, var(--hlc) 1.5%, var(--hlc) 98%, transparent 99.6%) no-repeat 0 92% / 100% 62%; padding: 0 3px; border-radius: 4px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.x-sheet span[data-hl='amarillo'] { --hlc: #FFF1B8; } .x-sheet span[data-hl='naranja'] { --hlc: #FFE2C2; } .x-sheet span[data-hl='rosa'] { --hlc: #FCDCE7; } .x-sheet span[data-hl='azul'] { --hlc: #DCEBFF; } .x-sheet span[data-hl='verde'] { --hlc: #D9F4E2; } .x-sheet span[data-hl='morado'] { --hlc: #E9DDFA; }
.x-sheet b, .x-sheet strong { font-weight: 700; } .x-sheet mark { background: #FFF3B0; }
.x-sheet ul, .x-sheet ol { margin: 0; padding-left: 20px; }`
}

/** Celda de tabla: con formato si la tabla es nueva, texto plano si es antigua */
const cellHtml = (b, c) => (b.rich ? c ?? '' : esc(c))

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
    case 'box': { let k = 0; const pc = POSTIT_COLORS[b.color] ?? POSTIT_COLORS.amarillo; return `<div class="x-b x-postit" style="--pb:${pc.bar};--pf:${pc.bg}">${(b.blocks ?? []).map((c) => { k = c.type === 'numbered' ? k + 1 : 0; return blockHtml(c, k, imgs) }).join('')}</div>` }
    case 'code': {
      const marks = b.marks ?? {}
      // con líneas subrayadas, cada línea es un bloque (la marcada lleva banda y raya de color)
      const body = Object.keys(marks).length ? (b.code ?? '').split('\n').map((l, i) => { const pc = POSTIT_COLORS[marks[i]]; return pc ? `<span class="x-cm" style="--m:${pc.bar}">${esc(l) || ' '}</span>` : `<span class="x-cl">${esc(l) || ' '}</span>` }).join('') : esc(b.code)
      return `<div class="x-b x-code">${b.lang ? `<span class="x-lang">${esc(b.lang)}</span>` : ''}${body}</div>`
    }
    case 'table': {
      const rows = b.rows ?? []
      const cg = b.colW && b.colW.length === (rows[0]?.length ?? 0) ? `<colgroup>${b.colW.map((f) => `<col style="width:${(f * 100).toFixed(2)}%">`).join('')}</colgroup>` : ''
      return `<div class="x-b${rows.length > 2 ? ' x-split' : ''}"><table class="x-table">${cg}${rows.map((r, i) => `<tr${b.rowH?.[i] ? ` style="height:${b.rowH[i]}px"` : ''}>${r.map((c) => (i === 0 ? `<th>${cellHtml(b, c)}</th>` : `<td>${cellHtml(b, c)}</td>`)).join('')}</tr>`).join('')}</table></div>`
    }
    case 'gallery': return (b.files ?? []).some((f) => imgs[f.id]) ? `<div class="x-b x-gal x-gal-${b.layout ?? 'row'}"${b.w ? ` style="width:${b.w}%;${b.align === 'center' ? 'margin-left:auto;margin-right:auto;' : b.align === 'right' ? 'margin-left:auto;' : ''}"` : ''}>${(b.files ?? []).filter((f) => imgs[f.id]).map((f) => `<img src="${imgs[f.id]}" alt="">`).join('')}</div>` : ''
    case 'image': return imgs[b.file?.id] ? `<div class="x-b"><img class="x-img" src="${imgs[b.file.id]}" alt=""${b.w || b.align ? ` style="${b.w ? `width:${b.w}%;max-height:none;` : ''}margin:0 ${b.align === 'left' || !b.align ? 'auto 0 0' : b.align === 'right' ? '0 0 auto' : 'auto'};"` : ''}></div>` : ''
    case 'link': return b.url ? `<div class="x-b x-link"><a href="${esc(b.url)}">${esc(b.title || b.url)}</a>${b.title ? `<span>${esc(b.url)}</span>` : ''}</div>` : ''
    case 'divider': return '<hr class="x-hr">'
    default: return `<div class="x-b x-text">${rich(b.html)}</div>`
  }
}

/** Cuerpo de la hoja: los bloques en su orden, con los saltos de página que hayas puesto. */
export function sheetHtml({ title, subtitle, blocks, breaks, imgs, dots = true, cover = null, pageNums = {} }) {
  let n = 0
  const body = blocks.map((b, i) => {
    n = b.type === 'numbered' ? (blocks[i - 1]?.type === 'numbered' ? n + 1 : 1) : 0
    const h = blockHtml(b, n, imgs)
    return breaks.has(b.id) && i > 0 ? `<div class="x-pb">${h}</div>` : h
  }).join('')
  if (cover?.on) return `<div class="x-sheet">${coverHtml(cover, title, subtitle)}${cover.index ? indexHtml(blocks, pageNums) : ''}${body}</div>` // con portada, esta sustituye a la cabecera
  return `<div class="x-sheet"><div class="x-head">${dots ? '<i></i>' : ''}${esc(title)}${subtitle ? ` · ${esc(subtitle)}` : ''}</div>${body}</div>`
}

/** Fotos de los apuntes → data URL (para que salgan en el PDF). */
export async function loadImages(blocks) {
  const out = {}
  const files = blocks.flatMap((b) => (b.type === 'image' && b.file?.id ? [b.file] : b.type === 'gallery' ? (b.files ?? []).filter((f) => f?.id) : []))
  await Promise.all(files.map(async (file) => {
    try {
      const blob = await getFile(file.id)
      if (blob) out[file.id] = await new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(blob) })
    } catch { /* sin foto */ }
  }))
  return out
}

/**
 * Documento completo para imprimir. El margen de la hoja (20 mm) no se pone con @page sino con una cabecera y un pie vacíos
 * que se repiten en cada página: con @page margin 0 el navegador no escribe fecha, título, dirección ni número de página.
 */
export function printDocument(html, st, title) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Lora:wght@400;700&display=swap" rel="stylesheet">
<style>@page { size: A4; margin: 0; } html, body { margin: 0; background: #fff; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { width: 100%; border-collapse: collapse; } .pg td { padding: 0; } .sp { height: 20mm; } .pg-in { padding: 0 20mm; }
${sheetCss(st)}</style></head><body>
<table class="pg"><thead><tr><td><div class="sp"></div></td></tr></thead><tbody><tr><td><div class="pg-in">${html}</div></td></tr></tbody><tfoot><tr><td><div class="sp"></div></td></tr></tfoot></table>
</body></html>`
}

/** Imprime un documento HTML en un marco oculto (diálogo del navegador, «Guardar como PDF»). */
async function printFrame(docHtml) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const d = frame.contentDocument
  d.open()
  d.write(docHtml)
  d.close()
  try { await Promise.race([d.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) } catch { /* sin fuentes */ }
  await new Promise((r) => setTimeout(r, 150))
  frame.contentWindow.focus()
  frame.contentWindow.print()
  setTimeout(() => frame.remove(), 60000)
}

/** Imprime la hoja como PDF con el diálogo del navegador («Guardar como PDF»). */
export async function printSheet(html, st, title) { return printFrame(printDocument(html, st, title)) }

/**
 * «Lo que ves es lo que sale»: se imprimen las MISMAS hojas de la vista previa. Cada hoja es una página A4 con su trozo del documento
 * ya colocado (mismos saltos, mismos cortes, misma portada, índice y números), así el PDF no cambia nada respecto a lo que viste.
 * `pages` = [{ from, to, cap, items: [{ top, bottom, html }] }] en píxeles de la tira de la vista previa.
 */
export function printPaged(pages, st, title) {
  const total = pages.length
  const body = pages.map((pg, k) => {
    const items = pg.items.map((it) => `<div class="pp-it" style="top:${it.top - pg.from}px;height:${it.bottom - it.top}px">${it.html}</div>`).join('')
    const cap = (pos, c) => (c ? `<i class="pp-cap pp-cap-${pos}" style="--pf:${c.pf};--pb:${c.pb};${pos === 'b' ? `top:${PAGE.m + Math.max(pg.to - pg.from, 1)}px` : ''}"></i>` : '')
    return `<section class="pp"><div class="pp-win" style="height:${Math.max(pg.to - pg.from, 1)}px">${items}</div>${cap('t', pg.cap?.top)}${cap('b', pg.cap?.bottom)}<span class="pp-n">${k + 1} / ${total}</span></section>`
  }).join('')
  return printFrame(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Lora:wght@400;700&display=swap" rel="stylesheet">
<style>@page { size: A4; margin: 0; } html, body { margin: 0; background: #fff; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pp { position: relative; width: 210mm; height: 297mm; overflow: hidden; break-after: page; page-break-after: always; background: #fff; } .pp:last-child { break-after: auto; page-break-after: auto; }
.pp-win { position: absolute; left: ${PAGE.m}px; top: ${PAGE.m}px; width: 642px; overflow: hidden; }
.pp-it { position: absolute; left: 0; width: 642px; overflow: hidden; }
.pp-n { position: absolute; bottom: 28px; left: 0; right: 0; text-align: center; font: 11px Poppins, sans-serif; color: #9AA0A6; }
.pp-cap { position: absolute; left: ${PAGE.m}px; width: 642px; height: 14px; background: var(--pf, #FFF1B8); border-left: 5px solid var(--pb, #F2B705); }
.pp-cap-b { border-radius: 0 0 12px 4px; } .pp-cap-t { top: ${PAGE.m - 14}px; border-radius: 4px 12px 0 0; }
${sheetCss(st)}</style></head><body>${body}</body></html>`)
}

// Alto útil de una página A4 con márgenes de 20 mm (a 96 dpi) y alto de línea del texto (13 px × 1,65)
export const PAGE = { w: 794, h: 1123, m: 76, content: 971 }
const LH = 21.45
const SPLITTABLE = ['text', 'bullet', 'numbered', 'todo', 'quote']

/**
 * Reparte una tira continua en páginas A4 como lo haría el PDF: el texto puede continuar en la página siguiente
 * (cortando entre líneas); tablas, código, fotos, destacados… pasan enteros; un título no se queda solo al final (ni una hoja con solo un título); los saltos de página que pones tú mandan.
 * `items` = [{ top, bottom, type, force, cuts? }] en orden (`cuts` = alturas donde se puede cortar dentro de un bloque: filas de una tabla larga; un Post-it se corta entre bloques o filas). Devuelve [[desde, hasta], …] en px de la tira.
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
        } else if (cross.top > start) {
          // Tablas largas y Post-it con varias cosas dentro se pueden cortar entre filas / entre bloques: si pasarlos enteros dejaría un hueco grande, se corta
          const cuts = (cross.cuts ?? []).filter((c) => c > cross.top + 24 && c > start + 1 && c <= end + 0.5)
          const tall = cross.bottom - cross.top > H
          if (cuts.length && (tall || end - cross.top > H * 0.2)) end = cuts[cuts.length - 1]
          else if (!tall) end = cross.top // pasa entero a la hoja siguiente… salvo que sea más alto que una hoja: entonces se corta ahí mismo (así su título no se queda solo)
        }
      }
      // Un título (o varios seguidos) nunca queda al final de una hoja: se va con lo que le sigue. Los saltos que pones tú se respetan siempre.
      let last = items.filter((it) => it.bottom <= end + 0.5 && it.top >= start).pop()
      while (last && /^h[123]$/.test(last.type) && last.top > start) { end = last.top; last = items.filter((it) => it.bottom <= end + 0.5 && it.top >= start).pop() }
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
