import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { COLORS, DEFAULT_STYLE, FONTS, PAGE, RADII, loadImages, paginate, printSheet, sheetCss, sheetHtml, blockHtml } from '../lib/exportNotes.js'

const FONT_NAMES = { poppins: 'Poppins', lora: 'Lora', mono: 'Mono' }
const load = () => { try { return { ...DEFAULT_STYLE, ...JSON.parse(localStorage.getItem('exportStyle') || '{}') } } catch { return DEFAULT_STYLE } }

/**
 * Vista previa para exportar los apuntes a PDF: eliges letra, color y redondeo, y puedes mover bloques
 * o forzar un salto de página antes de exportar. Sin tocar nada, el PDF ya no corta ningún bloque.
 */
export default function ExportDialog({ title, subtitle, blocks: initial, onClose }) {
  const [blocks, setBlocks] = useState(() => initial.filter((b) => b.type !== 'text' || (b.html ?? '').replace(/<[^>]*>/g, '').trim()))
  const [breaks, setBreaks] = useState(() => new Set())
  const [st, setSt] = useState(load)
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
  useEffect(() => { try { localStorage.setItem('exportStyle', JSON.stringify(st)) } catch { /* sin guardado */ } }, [st])
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
    const items = [...el.children].map((c, i) => ({ top: c.offsetTop, bottom: c.offsetTop + c.offsetHeight, type: i === 0 ? 'head' : blocks[i - 1]?.type, force: i > 0 && breaks.has(blocks[i - 1]?.id) }))
    const next = paginate(items, el.scrollHeight)
    setPages((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next))
  }
  useLayoutEffect(() => {
    measure()
    const el = strip.current
    const ro = new ResizeObserver(measure)
    if (el) ro.observe(el)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [blocks, breaks, imgs, st]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p) => setSt((s) => ({ ...s, ...p }))
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; setBlocks(n) }
  const toggleBreak = (id) => setBreaks((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const numbers = useMemo(() => { let n = 0; return blocks.map((b, i) => { n = b.type === 'numbered' ? (blocks[i - 1]?.type === 'numbered' ? n + 1 : 1) : 0; return n }) }, [blocks])

  const exportPdf = async () => {
    setBusy(true)
    try { await printSheet(sheetHtml({ title, subtitle, blocks, breaks, imgs }), st, title) } finally { setBusy(false) }
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
          <div className="xp-sheetwrap" ref={wrap}>
            <style>{sheetCss(st)}</style>
            <div style={{ width: PAGE.w * scale, height: (pages.length * (PAGE.h + 18)) * scale, margin: '0 auto' }}>
              <div className="xp-pages" style={{ width: PAGE.w, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {pages.map(([from, to], k) => (
                  <div key={k} className="xp-page">
                    <div className="xp-win" style={{ height: Math.max(to - from, 1) }}>
                      <div className="xp-strip" ref={k === 0 ? strip : null} style={{ transform: `translateY(${-from}px)` }}>
                        <div className="x-sheet"><div className="x-head"><i />{title}{subtitle ? ` · ${subtitle}` : ''}</div></div>
                        {blocks.map((b, i) => (
                          <div key={b.id} className={`xp-row ${breaks.has(b.id) && i > 0 ? 'has-break' : ''}`}>
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
          <div className="xp-style">
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
