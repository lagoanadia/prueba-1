import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { SEGMENT_LABEL, autoPayload, blocksOfPage, classifySelection, toPayload } from '../lib/pdfSelection.js'

// Cómo se puede pegar lo seleccionado: el primero es lo que se detecta solo
const KINDS = [{ id: 'auto', label: 'Auto', icon: 'marker' }, { id: 'text', label: 'Texto', icon: 'note' }, { id: 'title', label: 'Título', icon: 'title' }, { id: 'list', label: 'Lista', icon: 'list' }, { id: 'code', label: 'Código', icon: 'code' }, { id: 'table', label: 'Tabla', icon: 'table' }]
const KIND_OF = Object.fromEntries(KINDS.map((k) => [k.id, k]))

/**
 * PDF dibujado como páginas limpias dentro de la pantalla (sin la barra del visor del navegador): se ajusta al ancho,
 * con página actual y zoom. Las páginas se pintan solo cuando se acercan, para que los PDF largos vayan ligeros.
 */
export default function PdfPages({ blob, name, onFallback, onPickText }) {
  const box = useRef(null)
  const [pdf, setPdf] = useState(null)
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [current, setCurrent] = useState(1)
  const [pick, setPick] = useState(null) // { x, y, text, info, type } de lo seleccionado
  const [done, setDone] = useState(false)
  const [ov, setOv] = useState({ hover: null, sel: null, marquee: null }) // recuadros que se dibujan encima: bloque bajo el ratón, lo seleccionado y el cuadro de arrastre
  const blocksCache = useRef(new WeakMap())
  const dragRef = useRef(null)
  const checkRef = useRef(null)
  const root = useRef(null)
  const fitted = useRef(false)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
        if (!dead) setPdf(doc)
      } catch { if (!dead) onFallback?.() } // si no se puede dibujar, se usa el visor del navegador
    })()
    return () => { dead = true }
  }, [blob]) // eslint-disable-line react-hooks/exhaustive-deps

  // Al abrir, el PDF se acerca solo lo máximo posible: se mide dónde está el texto (sin los márgenes en blanco) y se ajusta a eso
  useEffect(() => {
    if (!pdf || fitted.current) return undefined
    let dead = false
    ;(async () => {
      try {
        let lo = Infinity; let hi = -Infinity; let pw = 0
        for (let n = 1; n <= Math.min(3, pdf.numPages); n++) {
          const p = await pdf.getPage(n)
          const [x0, , x1] = p.view
          pw = Math.max(pw, x1 - x0)
          const { items } = await p.getTextContent()
          items.filter((it) => it.str.trim()).forEach((it) => { lo = Math.min(lo, it.transform[4] - x0); hi = Math.max(hi, it.transform[4] - x0 + it.width) })
        }
        if (dead || !pw || !(hi > lo)) return
        const pad = pw * 0.04 // un poco de aire para no cortar cajas y fondos que sobresalen del texto
        const z = Math.min(1.8, Math.max(1, +(pw / (hi - lo + pad * 2)).toFixed(2)))
        fitted.current = true
        if (z > 1.02) {
          setZoom(z)
          setTimeout(() => { const el = box.current; if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2 }, 250) // centrado en el contenido
        }
      } catch { /* sin medida: se queda en ancho de página */ }
    })()
    return () => { dead = true }
  }, [pdf])

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Al seleccionar texto del PDF aparece «Pasar a apuntes» junto a la selección
  useEffect(() => {
    if (!onPickText) return undefined
    const check = () => {
      const sel = window.getSelection()
      const el = box.current
      const text = sel?.toString().replace(/\s*\n\s*/g, ' ').trim()
      if (!sel || sel.isCollapsed || !text || !el || !el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) { setPick(null); return }
      const r = sel.getRangeAt(0).getBoundingClientRect()
      const c = root.current.getBoundingClientRect()
      const z = parseFloat(getComputedStyle(root.current.closest('.d-app') ?? document.body).zoom) || 1 // la vista de escritorio va con zoom
      setDone(false)
      const info = classifySelection(el, sel)
      const words = text.split(/\s+/).filter(Boolean).length
      setPick((cur) => ({ x: Math.max(8, (r.left - c.left) / z), y: Math.max(40, (r.top - c.top) / z - 44), text, info, words, type: cur && cur.text === text ? cur.type : 'auto' }))
      setOv((o) => ({ ...o, sel: selUi(sel, r) }))
    }
    checkRef.current = check
    const onScroll = () => { if (window.getSelection()?.toString().trim()) requestAnimationFrame(check) }
    box.current?.addEventListener('scroll', onScroll)
    document.addEventListener('mouseup', check)
    document.addEventListener('keyup', check)
    document.addEventListener('touchend', check)
    const scrollEl = box.current
    return () => { scrollEl?.removeEventListener('scroll', onScroll); document.removeEventListener('mouseup', check); document.removeEventListener('keyup', check); document.removeEventListener('touchend', check) }
  }, [onPickText])

  // ---- Bloques de cada página, cuadro de arrastre y clic para coger un bloque entero ----
  const pagesEls = () => [...(box.current?.querySelectorAll('.pdfp-page') ?? [])]
  const blocksFor = (pageEl) => {
    const key = `${pageEl.querySelectorAll('.textLayer span').length}|${Math.round(pageEl.getBoundingClientRect().width)}`
    const c = blocksCache.current.get(pageEl)
    if (c && c.key === key) return c.blocks
    const blocks = blocksOfPage(pageEl)
    blocksCache.current.set(pageEl, { key, blocks })
    return blocks
  }
  const absRect = (pageEl, b) => { const pr = pageEl.getBoundingClientRect(); return { left: pr.left + b.rect.left, right: pr.left + b.rect.right, top: pr.top + b.rect.top, bottom: pr.top + b.rect.bottom } }
  const spansIn = (pageEl, r) => [...pageEl.querySelectorAll('.textLayer span')].filter((x) => {
    if (!x.textContent.trim() || x.classList.contains('markedContent')) return false
    const q = x.getBoundingClientRect(); const cx = (q.left + q.right) / 2; const cy = (q.top + q.bottom) / 2
    return cx >= r.left - 2 && cx <= r.right + 2 && cy >= r.top - 2 && cy <= r.bottom + 2
  })
  const toRoot = (r) => {
    const c = root.current.getBoundingClientRect()
    const z = parseFloat(getComputedStyle(root.current.closest('.d-app') ?? document.body).zoom) || 1
    return { x: (r.left - c.left) / z, y: (r.top - c.top) / z, w: (r.right - r.left) / z, h: (r.bottom - r.top) / z }
  }
  const hitBlock = (x, y) => {
    for (const pg of pagesEls()) {
      const pr = pg.getBoundingClientRect()
      if (y < pr.top || y > pr.bottom || x < pr.left || x > pr.right) continue
      const hits = blocksFor(pg).map((b) => ({ b, r: absRect(pg, b) })).filter(({ r }) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 3 && y <= r.bottom + 3)
      hits.sort((a, c) => (a.r.right - a.r.left) * (a.r.bottom - a.r.top) - (c.r.right - c.r.left) * (c.r.bottom - c.r.top))
      if (hits[0]) return { pg, b: hits[0].b, r: hits[0].r }
    }
    return null
  }
  // Selecciona (con la selección normal del navegador) todo el texto de esos recuadros; el resto sigue como siempre
  const selectSpans = (list) => {
    const all = [...new Set(list)]
    if (!all.length) return
    all.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    const a = all[0].firstChild; const z = all[all.length - 1].lastChild
    if (!a || !z) return
    window.getSelection().setBaseAndExtent(a, 0, z, z.length ?? 0)
    setTimeout(() => checkRef.current?.(), 0)
  }
  // Qué recuadros toca la selección actual y cómo se ve: palabra suelta, parte de un bloque, bloque entero o varios
  const selUi = (sel, r) => {
    const touched = []
    for (const pg of pagesEls()) {
      const pr = pg.getBoundingClientRect()
      if (pr.bottom < r.top || pr.top > r.bottom) continue
      for (const b of blocksFor(pg)) {
        const sp = spansIn(pg, absRect(pg, b))
        const inSel = sp.filter((x) => { try { return sel.containsNode(x, true) } catch { return false } })
        if (inSel.length) touched.push({ pg, b, whole: inSel.length === sp.length && sp.every((x) => { try { return sel.containsNode(x, false) } catch { return false } }) })
      }
    }
    const words = sel.toString().split(/\s+/).filter(Boolean).length
    const one = touched.length === 1 ? touched[0] : null
    const squash = (t) => t.replace(/\s+/g, '').length
    if (one && !one.whole && squash(sel.toString()) >= squash(one.b.text) * 0.92) one.whole = true // casi todo su texto: cuenta como bloque entero
    const whole = Boolean(one?.whole) || touched.length > 1
    const chip = touched.length === 0 ? '' : words === 1 && touched.length <= 1 ? `${touched[0].b.label} · 1 palabra` : one ? `${one.b.label} · ${one.whole ? 'bloque entero' : 'parte del bloque'}` : `${touched.length} bloques`
    return { box: toRoot(r), blocks: touched.map((t) => toRoot(absRect(t.pg, t.b))), chip, strong: whole, word: words === 1 }
  }
  const onMove = (e) => {
    if (dragRef.current || e.buttons) return
    const h = hitBlock(e.clientX, e.clientY)
    setOv((o) => {
      if (!h) return o.hover ? { ...o, hover: null } : o
      const box_ = toRoot(h.r)
      const cur = o.hover
      if (cur && Math.abs(cur.box.x - box_.x) < 0.5 && Math.abs(cur.box.y - box_.y) < 0.5 && cur.label === h.b.label) return o
      return { ...o, hover: { box: box_, label: h.b.label } }
    })
  }
  const onDown = (e) => {
    if (e.button === 0 && e.detail >= 2) window.getSelection()?.removeAllRanges() // un doble clic coge la palabra (no se queda con el bloque de antes)
    if (e.button !== 0 || e.detail >= 2 || e.target.closest?.('.textLayer span')) return // sobre el texto manda la selección normal
    dragRef.current = { x0: e.clientX, y0: e.clientY, moved: false }
    const move = (ev) => {
      const d = dragRef.current
      if (!d) return
      if (!d.moved && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 5) return
      if (!d.moved) { d.moved = true; window.getSelection()?.removeAllRanges(); root.current?.classList.add('is-marquee'); setPick(null); setOv((o) => ({ ...o, sel: null, hover: null })) }
      const r = { left: Math.min(d.x0, ev.clientX), right: Math.max(d.x0, ev.clientX), top: Math.min(d.y0, ev.clientY), bottom: Math.max(d.y0, ev.clientY) }
      const n = marqueeBlocks(r).length
      setOv((o) => ({ ...o, marquee: { box: toRoot(r), n } }))
    }
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      const d = dragRef.current
      root.current?.classList.remove('is-marquee')
      setOv((o) => ({ ...o, marquee: null }))
      if (d?.moved) {
        const r = { left: Math.min(d.x0, ev.clientX), right: Math.max(d.x0, ev.clientX), top: Math.min(d.y0, ev.clientY), bottom: Math.max(d.y0, ev.clientY) }
        selectSpans(marqueeBlocks(r).flatMap(({ pg, b }) => spansIn(pg, absRect(pg, b))))
        justDragged.current = true; setTimeout(() => { justDragged.current = false }, 0)
      }
      dragRef.current = null
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const justDragged = useRef(false)
  // Los bloques que cubre el cuadro (al menos una tercera parte de cada uno)
  const marqueeBlocks = (r) => pagesEls().flatMap((pg) => blocksFor(pg).map((b) => ({ pg, b, a: absRect(pg, b) })).filter(({ a }) => {
    const w = Math.min(a.right, r.right) - Math.max(a.left, r.left); const h = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top)
    return w > 0 && h > 0 && (w * h) / ((a.right - a.left) * (a.bottom - a.top) || 1) >= 0.33
  }))
  // Un clic sobre un bloque lo coge entero (Mayús+clic suma otro); un doble clic sigue cogiendo la palabra
  const onClickBlock = (e) => {
    if (justDragged.current || e.detail >= 2) return
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed && sel.toString().trim()) return
    const h = hitBlock(e.clientX, e.clientY)
    if (!h) return
    const mine = spansIn(h.pg, h.r)
    if (e.shiftKey && pick) { const prev = []; const s0 = window.getSelection(); for (const pg of pagesEls()) for (const x of pg.querySelectorAll('.textLayer span')) { try { if (s0.containsNode(x, true)) prev.push(x) } catch { /* nodo fuera */ } } selectSpans([...prev, ...mine]); return }
    selectSpans(mine)
  }

  const send = () => {
    onPickText(pick.info ? (pick.type === 'auto' ? autoPayload(pick.info) : toPayload(pick.info, pick.type)) : pick.text)
    window.getSelection()?.removeAllRanges()
    setDone(true)
    setTimeout(() => setPick(null), 900)
  }

  const open = () => { const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000) }

  return (
    <div className="pdfp" ref={root}>
      <div className="pdfp-bar">
        <span className="pdfp-count">{pdf ? `Página ${current} de ${pdf.numPages}` : 'Abriendo…'}</span>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Alejar" title="Alejar"><Icon name="minus" size={16} /></button>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))} aria-label="Acercar" title="Acercar"><Icon name="plus" size={16} /></button>
        <button className="icon-btn" onClick={open} aria-label="Abrir en el visor del navegador (buscar y copiar texto)" title="Abrir en el navegador"><Icon name="expand" size={16} /></button>
      </div>
      <div className="pdfp-pages" ref={box} onPointerMove={onMove} onPointerLeave={() => setOv((o) => (o.hover ? { ...o, hover: null } : o))} onMouseDown={onDown} onClick={onClickBlock}>
        {pdf && width > 0 && Array.from({ length: pdf.numPages }, (_, i) => <PdfPage key={i} pdf={pdf} n={i + 1} width={Math.max(120, width - 4) * zoom} root={box} onSeen={setCurrent} />)}
      </div>
      <div className="pdfp-ov" aria-hidden="true">
        {ov.hover && !ov.marquee && !(ov.sel && ov.sel.strong) && <i className="pdfp-hov" style={{ left: ov.hover.box.x, top: ov.hover.box.y, width: ov.hover.box.w, height: ov.hover.box.h }}><b>{ov.hover.label} · clic para cogerlo</b></i>}
        {pick && ov.sel && !ov.sel.strong && ov.sel.blocks.map((b, k) => <i key={k} className="pdfp-bk" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />)}
        {pick && ov.sel && <i className={`pdfp-selbox ${ov.sel.strong ? 'is-strong' : ''} ${ov.sel.word ? 'is-word' : ''}`} style={{ left: ov.sel.box.x - 2, top: ov.sel.box.y - 2, width: ov.sel.box.w + 4, height: ov.sel.box.h + 4 }}>{ov.sel.chip && <b>{ov.sel.chip}</b>}</i>}
        {ov.marquee && <i className="pdfp-marq" style={{ left: ov.marquee.box.x, top: ov.marquee.box.y, width: ov.marquee.box.w, height: ov.marquee.box.h }}><b>{ov.marquee.n} {ov.marquee.n === 1 ? 'bloque' : 'bloques'}</b></i>}
      </div>
      {pick && (
        <div className={`pdfp-pick ${done ? 'is-done' : ''}`} style={{ left: pick.x, top: pick.y }} onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()}>
          {!done && (
            <button type="button" className="pdfp-kind" onClick={() => setPick((p) => ({ ...p, type: KINDS[(KINDS.findIndex((k) => k.id === p.type) + 1) % KINDS.length].id }))} title="Cambiar cómo se pega (título, lista, tabla, texto)" aria-label={`Se pegará como ${KIND_OF[pick.type]?.label}. Pulsa para cambiarlo`}>
              <Icon name={KIND_OF[pick.type]?.icon ?? 'note'} size={14} strokeWidth={2.4} />{pick.type === 'auto' && pick.info ? `Auto · ${[...new Set(pick.info.segments.map((x) => SEGMENT_LABEL[x.type]))].slice(0, 4).join(' + ')}` : KIND_OF[pick.type]?.label}
            </button>
          )}
          <button type="button" className="pdfp-go" onClick={send}><Icon name={done ? 'check' : 'arrow'} size={14} strokeWidth={2.6} />{done ? 'Pasado' : pick.words === 1 ? 'Pasar palabra' : 'Pasar a apuntes'}</button>
        </div>
      )}
    </div>
  )
}

function PdfPage({ pdf, n, width, root, onSeen }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const text = useRef(null)
  const [size, setSize] = useState({ w: width, h: width * 1.414 })
  const [near, setNear] = useState(n <= 2)
  const [drawn, setDrawn] = useState('')

  useEffect(() => {
    let dead = false
    pdf.getPage(n).then((p) => { if (dead) return; const v = p.getViewport({ scale: 1 }); setSize({ w: width, h: (width * v.height) / v.width }) })
    return () => { dead = true }
  }, [pdf, n, width])

  // Se pinta cuando se acerca a la zona visible; la página que ocupa el centro es la «actual»
  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const near_ = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true) }, { root: root.current, rootMargin: '600px 0px' })
    const mid = new IntersectionObserver(([e]) => { if (e.isIntersecting) onSeen(n) }, { root: root.current, rootMargin: '-45% 0px -45% 0px' })
    near_.observe(el); mid.observe(el)
    return () => { near_.disconnect(); mid.disconnect() }
  }, [n, root, onSeen])

  useEffect(() => {
    if (!near) return undefined
    const key = `${Math.round(width)}`
    if (drawn === key) return undefined
    let task = null
    let layer = null // capa de texto de esta pasada: si cambia el ancho a media pintura se cancela (si no, el texto salía duplicado)
    let dead = false
    pdf.getPage(n).then((p) => {
      if (dead || !canvas.current) return
      const base = p.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const vp = p.getViewport({ scale: (width / base.width) * dpr })
      const c = canvas.current
      c.width = vp.width; c.height = vp.height
      task = p.render({ canvasContext: c.getContext('2d'), viewport: vp })
      task.promise.then(() => { if (!dead) setDrawn(key) }).catch(() => {})
      // Capa de texto transparente encima: permite seleccionar y copiar
      const t = text.current
      if (t) {
        t.replaceChildren()
        const css = p.getViewport({ scale: width / base.width })
        t.style.setProperty('--total-scale-factor', String(css.scale))
        import('pdfjs-dist').then((pdfjs) => { if (dead) return; layer = new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: t, viewport: css }); layer.render().catch(() => {}) })
      }
    })
    return () => { dead = true; task?.cancel?.(); try { layer?.cancel() } catch { /* ya terminada */ } }
  }, [near, pdf, n, width]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrap} className="pdfp-page" style={{ width: size.w, height: size.h }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%' }} />
      <div ref={text} className="textLayer" />
    </div>
  )
}
