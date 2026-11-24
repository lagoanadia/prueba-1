import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { COLORS, DEFAULT_COVER, DEFAULT_STYLE, coverHtml, headingsOf, indexHtml, syncCodeColor, FONTS, PAGE, RADII, loadImages, paginate, printSheet, sheetCss, sheetHtml, blockHtml } from '../lib/exportNotes.js'

const FONT_NAMES = { poppins: 'Poppins', lora: 'Lora', mono: 'Mono' }
const loadCover = () => { try { return { ...DEFAULT_COVER, ...JSON.parse(localStorage.getItem('exportCover') || '{}') } } catch { return DEFAULT_COVER } }
const load = () => { try { return { ...DEFAULT_STYLE, ...JSON.parse(localStorage.getItem('exportStyle') || '{}') } } catch { return DEFAULT_STYLE } }

/**
 * Vista previa para exportar los apuntes a PDF: eliges letra, color y redondeo, y puedes mover bloques
 * o forzar un salto de página antes de exportar. Sin tocar nada, el PDF ya no corta ningún bloque.
 */
export default function ExportDialog({ title, subtitle, blocks: initial, onClose }) {
  const [blocks, setBlocks] = useState(() => initial.filter((b) => b.type !== 'text' || (b.html ?? '').replace(/<[^>]*>/g, '').trim()))
  const [breaks, setBreaks] = useState(() => new Set())
  const [st, setSt] = useState(load)
  const [cover, setCover] = useState(loadCover) // portada (y índice en la hoja 2)
  const [pageNums, setPageNums] = useState({}) // hoja donde cae cada título, para el índice
  const [imgs, setImgs] = useState({})
  const [busy, setBusy] = useState(false)
  const wrap = useRef(null)
  const [scale, setScale] = useState(1)
  // La hoja de la vista previa mide lo que un A4 (794 px) y se encoge para caber, así los saltos de línea son los del PDF
  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, (e.contentRect.width - 36) / PAGE.w)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { loadImages(initial).then(setImgs) }, [initial])
  useEffect(() => { try { const { title: _t, subtitle: _s, ...keep } = cover; localStorage.setItem('exportCover', JSON.stringify(keep)) } catch { /* sin guardado */ } }, [cover])
  useEffect(() => { try { localStorage.setItem('exportStyle', JSON.stringify(st)) } catch { /* sin guardado */ } syncCodeColor(st.color) }, [st])
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  useEffect(() => { // la letra Lora solo se pide si hace falta
    if (!document.getElementById('x-lora')) { const l = document.createElement('link'); l.id = 'x-lora'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap'; document.head.appendChild(l) }
  }, [])

  // Páginas: se mide la tira continua y se reparte en hojas A4 como el PDF
  const strip = useRef(null)
  const [pages, setPages] = useState([[0, PAGE.content]])
  const measure = () => {
    const el = strip.current
    if (!el) return
    // altura de un elemento de dentro respecto a la tira (para saber dónde se puede cortar un bloque largo)
    const topIn = (node) => { let y = 0; let n = node; while (n && n !== el) { y += n.offsetTop; n = n.offsetParent } return y }
    const cutsOf = (c) => [...c.querySelectorAll('.x-postit > .x-b, .x-split tr')].map(topIn).filter((y) => y > 0)
    const lead = 1 + (cover.on && cover.index ? 1 : 0) // portada o cabecera, y el índice: cada uno ocupa su hoja
    const items = [...el.children].map((c, i) => {
      const pi = c.querySelector('.x-postit')
      const cs = pi ? getComputedStyle(pi) : null
      const bi = i - lead
      return { top: c.offsetTop, bottom: c.offsetTop + c.offsetHeight, type: i < lead ? 'head' : blocks[bi]?.type, force: bi > 0 && breaks.has(blocks[bi - 1]?.id), cuts: pi || c.querySelector('.x-split') ? cutsOf(c) : [], box: cs ? { pf: cs.getPropertyValue('--pf').trim(), pb: cs.getPropertyValue('--pb').trim() } : null }
    })
    // Si una hoja corta un Post-it por la mitad, se le dibuja un borde de cierre abajo y uno de apertura arriba en la siguiente (cada trozo se ve como un Post-it entero)
    const raw = paginate(items, el.scrollHeight)
    // En qué hoja cae cada título (para el índice)
    if (cover.on && cover.index) {
      const nums = {}
      items.forEach((it, i) => { const b = blocks[i - lead]; if (b && /^h[123]$/.test(b.type)) { const k = raw.findIndex(([a, z]) => it.top >= a - 1 && it.top < z - 1); nums[b.id] = (k < 0 ? raw.length : k + 1) } })
      setPageNums((cur) => (JSON.stringify(cur) === JSON.stringify(nums) ? cur : nums))
    }
    const next = raw.map(([a, z]) => [a, z, { bottom: items.find((it) => it.box && it.top < z - 1 && it.bottom > z + 1)?.box ?? null, top: items.find((it) => it.box && it.top < a - 1 && it.bottom > a + 1)?.box ?? null }])
    setPages((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next))
  }
  useLayoutEffect(() => {
    measure()
    const el = strip.current
    const ro = new ResizeObserver(measure)
    if (el) ro.observe(el)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [blocks, breaks, imgs, st, cover.on, cover.index, cover.style, cover.title, cover.subtitle, cover.author, cover.course, cover.date]) // eslint-disable-line react-hooks/exhaustive-deps

  // Moverse entre hojas: la actual según el scroll y atajos para saltar a cualquiera
  const [cur, setCur] = useState(0)
  const pageEls = () => [...(wrap.current?.querySelectorAll('.xp-page') ?? [])]
  const onScroll = () => {
    const w = wrap.current
    if (!w) return
    const mid = w.getBoundingClientRect().top + w.clientHeight / 3
    let best = 0
    pageEls().forEach((el, i) => { if (el.getBoundingClientRect().top <= mid) best = i })
    setCur(best)
  }
  const goPage = (i) => {
    const el = pageEls()[Math.max(0, Math.min(i, pages.length - 1))]
    const w = wrap.current
    if (!el || !w) return
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    w.scrollTo({ top: w.scrollTop + el.getBoundingClientRect().top - w.getBoundingClientRect().top - 12, behavior: smooth ? 'smooth' : 'auto' })
  }
  // Mover bloques arrastrándolos a cualquier punto de cualquier hoja
  const [drag, setDrag] = useState(null) // { id, over, after }
  const dropBlock = () => {
    const d = drag
    setDrag(null)
    if (!d?.over || d.over === d.id) return
    setBlocks((list) => {
      const item = list.find((x) => x.id === d.id)
      const rest = list.filter((x) => x.id !== d.id)
      const at = rest.findIndex((x) => x.id === d.over)
      if (!item || at < 0) return list
      rest.splice(at + (d.after ? 1 : 0), 0, item)
      return rest
    })
  }
  const rowDrag = (b) => ({
    draggable: true,
    onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); setDrag({ id: b.id, over: null, after: false }) },
    onDragEnd: () => setDrag(null),
    onDragOver: (e) => {
      if (!drag) return
      e.preventDefault()
      const r = e.currentTarget.getBoundingClientRect()
      const after = e.clientY > r.top + r.height / 2
      if (drag.over !== b.id || drag.after !== after) setDrag({ ...drag, over: b.id, after })
    },
    onDrop: (e) => { e.preventDefault(); dropBlock() },
  })
  // Al arrastrar cerca del borde de la vista previa, se desplaza sola
  const autoScroll = (e) => {
    if (!drag) return
    const w = wrap.current
    const r = w.getBoundingClientRect()
    if (e.clientY < r.top + 60) w.scrollTop -= 16
    else if (e.clientY > r.bottom - 60) w.scrollTop += 16
  }
  const set = (p) => setSt((s) => ({ ...s, ...p }))
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; setBlocks(n) }
  const toggleBreak = (id) => setBreaks((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const numbers = useMemo(() => { let n = 0; return blocks.map((b, i) => { n = b.type === 'numbered' ? (blocks[i - 1]?.type === 'numbered' ? n + 1 : 1) : 0; return n }) }, [blocks])

  const exportPdf = async () => {
    setBusy(true)
    try { await printSheet(sheetHtml({ title, subtitle, blocks, breaks, imgs, cover, pageNums }), st, title) } finally { setBusy(false) }
  }

  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Exportar a PDF">
      <div className="popup-backdrop" onClick={onClose} />
      <div className="popup-panel xp-panel">
        <div className="xp-top">
          <b className="name-dialog-title"><Icon name="pdf" size={20} color="#E84855" /> Exportar a PDF</b>
          <span style={{ flex: 1 }} />
          <button className="pill pill-on xp-go" onClick={exportPdf} disabled={busy || !blocks.length}><Icon name="upload" size={15} />Exportar</button>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar" title="Cerrar"><Icon name="close" size={20} /></button>
        </div>
        <div className="xp-body">
          <div className="xp-left">
            <nav className="xp-nav" aria-label="Hojas">
              <button className="icon-btn" onClick={() => goPage(cur - 1)} disabled={cur === 0} aria-label="Hoja anterior" title="Hoja anterior"><Icon name="left" size={16} /></button>
              <b>Hoja {Math.min(cur, pages.length - 1) + 1} de {pages.length}</b>
              <button className="icon-btn" onClick={() => goPage(cur + 1)} disabled={cur >= pages.length - 1} aria-label="Hoja siguiente" title="Hoja siguiente"><Icon name="right" size={16} /></button>
              {pages.length > 1 && (
                <span className="xp-jump" role="group" aria-label="Ir a la hoja">
                  {pages.map((_, i) => <button key={i} className={i === Math.min(cur, pages.length - 1) ? 'on' : ''} onClick={() => goPage(i)} aria-label={`Ir a la hoja ${i + 1}`} aria-current={i === cur ? 'page' : undefined}>{i + 1}</button>)}
                </span>
              )}
            </nav>
          <div className="xp-sheetwrap" ref={wrap} onScroll={onScroll} onDragOver={autoScroll}>
            <style>{sheetCss(st)}</style>
            <div style={{ width: PAGE.w * scale, height: (pages.length * (PAGE.h + 18)) * scale, margin: '0 auto' }}>
              <div className="xp-pages" style={{ width: PAGE.w, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {pages.map(([from, to, cap], k) => (
                  <div key={k} className="xp-page">
                    {cap?.top && <i className="xp-cap xp-cap-t" style={{ '--pf': cap.top.pf, '--pb': cap.top.pb }} />}
                    {cap?.bottom && <i className="xp-cap xp-cap-b" style={{ top: PAGE.m + Math.max(to - from, 1), '--pf': cap.bottom.pf, '--pb': cap.bottom.pb }} />}
                    <div className="xp-win" style={{ height: Math.max(to - from, 1) }}>
                      <div className="xp-strip" ref={k === 0 ? strip : null} style={{ transform: `translateY(${-from}px)` }}>
                        {cover.on
                          ? <div className="xp-virt" style={{ height: PAGE.content }}><div className="x-sheet" dangerouslySetInnerHTML={{ __html: coverHtml(cover, title, subtitle) }} /></div>
                          : <div className="x-sheet"><div className="x-head"><i />{title}{subtitle ? ` · ${subtitle}` : ''}</div></div>}
                        {cover.on && cover.index && <div className="xp-virt" style={{ height: PAGE.content }}><div className="x-sheet" dangerouslySetInnerHTML={{ __html: indexHtml(blocks, pageNums) }} /></div>}
                        {blocks.map((b, i) => (
                          <div key={b.id} className={`xp-row ${breaks.has(b.id) && i > 0 ? 'has-break' : ''} ${drag?.id === b.id ? 'is-dragging' : ''} ${drag?.over === b.id && drag.id !== b.id ? (drag.after ? 'drop-after' : 'drop-before') : ''}`} {...rowDrag(b)}>
                            <div className="xp-tools">
                              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" title="Subir"><span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="down" size={14} /></span></button>
                              <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Bajar" title="Bajar"><Icon name="down" size={14} /></button>
                              {i > 0 && <button className={breaks.has(b.id) ? 'on' : ''} onClick={() => toggleBreak(b.id)} aria-label="Empezar en página nueva" aria-pressed={breaks.has(b.id)} title="Empezar en página nueva"><Icon name="pdf" size={14} /></button>}
                            </div>
                            <div className="x-sheet" dangerouslySetInnerHTML={{ __html: blockHtml(b, numbers[i], imgs) }} />
                          </div>
                        ))}
                        {blocks.length === 0 && <p className="muted">Los apuntes están vacíos.</p>}
                      </div>
                    </div>
                    <span className="xp-pn">{k + 1} / {pages.length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
          <div className="xp-style">
            <div className="xp-grp"><span className="w-hint">Portada</span>
              <div className="xp-opts">
                <button className={`pill pill-sm ${cover.on ? 'pill-on' : ''}`} onClick={() => setCover((c) => ({ ...c, on: !c.on }))} aria-pressed={cover.on}>{cover.on ? 'Con portada' : 'Sin portada'}</button>
              </div>
              {cover.on && (
                <>
                  <div className="xp-covers" role="radiogroup" aria-label="Estilo de portada">
                    {['A', 'B', 'C'].map((k) => <button key={k} type="button" role="radio" aria-checked={cover.style === k} className={`xp-cvbtn ${cover.style === k ? 'on' : ''}`} onClick={() => setCover((c) => ({ ...c, style: k }))} aria-label={`Portada ${k}`} title={{ A: 'Limpia', B: 'Bloque de color', C: 'Raya lateral' }[k]}><span className={`xp-mini xp-mini-${k}`} style={{ '--c': st.color }}><i /><i /><b /></span></button>)}
                  </div>
                  <input className="xp-in" value={cover.title} placeholder={title || 'Título'} maxLength={80} onChange={(e) => setCover((c) => ({ ...c, title: e.target.value }))} aria-label="Título de la portada" />
                  <input className="xp-in" value={cover.subtitle} placeholder="Subtítulo" maxLength={90} onChange={(e) => setCover((c) => ({ ...c, subtitle: e.target.value }))} aria-label="Subtítulo" />
                  <input className="xp-in" value={cover.author} placeholder="Tu nombre" maxLength={60} onChange={(e) => setCover((c) => ({ ...c, author: e.target.value }))} aria-label="Tu nombre" />
                  <input className="xp-in" value={cover.course} placeholder="Curso o centro" maxLength={60} onChange={(e) => setCover((c) => ({ ...c, course: e.target.value }))} aria-label="Curso o centro" />
                  <input className="xp-in" value={cover.date} placeholder="Fecha" maxLength={40} onChange={(e) => setCover((c) => ({ ...c, date: e.target.value }))} aria-label="Fecha" />
                  <label className="xp-check"><input type="checkbox" checked={cover.index} onChange={(e) => setCover((c) => ({ ...c, index: e.target.checked }))} />Índice en la hoja 2</label>
                </>
              )}
            </div>
            <div className="xp-grp"><span className="w-hint">Letra</span>
              <div className="xp-opts">{Object.keys(FONTS).map((f) => <button key={f} className={`pill pill-sm ${st.font === f ? 'pill-on' : ''}`} style={{ fontFamily: FONTS[f] }} onClick={() => set({ font: f })} aria-pressed={st.font === f}>{FONT_NAMES[f]}</button>)}</div></div>
            <div className="xp-grp"><span className="w-hint">Color</span>
              <div className="xp-opts">{COLORS.map((c) => <button key={c} className={`xp-dot ${st.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={`Color ${c}`} aria-pressed={st.color === c} />)}</div></div>
            <div className="xp-grp"><span className="w-hint">Redondeo</span>
              <div className="xp-opts">{RADII.map((r) => <button key={r} className={`xp-round ${st.radius === r ? 'on' : ''}`} style={{ borderRadius: r / 1.3 }} onClick={() => set({ radius: r })} aria-label={`Redondeo ${r}`} aria-pressed={st.radius === r} />)}</div></div>
            <div className="xp-grp"><span className="w-hint">Filas</span>
              <div className="xp-opts">
                <button className={`pill pill-sm ${st.stripes ? 'pill-on' : ''}`} onClick={() => set({ stripes: true })}>Alternas</button>
                <button className={`pill pill-sm ${!st.stripes ? 'pill-on' : ''}`} onClick={() => set({ stripes: false })}>Lisas</button>
              </div></div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
