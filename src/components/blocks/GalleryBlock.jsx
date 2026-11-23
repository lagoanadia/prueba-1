import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { deleteFile, getFile, saveFile } from '../../lib/fileStore.js'

const LAYOUTS = [['row', 'Fila'], ['grid', 'Cuadrícula'], ['mosaic', 'Mosaico']]
const MIN_W = 20 // % mínimo del ancho de la página
const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' }
const ALIGN_PATH = { left: 'M4 6h16M4 12h10M4 18h14', center: 'M4 6h16M7 12h10M5 18h14', right: 'M4 6h16M10 12h10M6 18h14' }
const ALIGN_LABEL = { left: 'Alinear a la izquierda', center: 'Centrar', right: 'Alinear a la derecha' }

/** Ancho y alto de una foto (para repartirlas sin recortarlas) */
const sizeOf = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url) }
  img.onerror = () => { resolve({}); URL.revokeObjectURL(url) }
  img.src = url
})

/** Una foto de la galería (se lee del almacén de archivos) */
function Thumb({ file, ratio, onRatio, onRemove, drag, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    let made = null
    setUrl(null)
    getFile(file.id).then((blob) => { if (blob && alive) { made = URL.createObjectURL(blob); setUrl(made) } }).catch(() => {})
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [file.id])
  return (
    <div className={`gal-item ${drag === 'src' ? 'is-drag' : ''} ${drag === 'over' ? 'is-over' : ''}`} style={{ '--ar': ratio }} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      {url ? <img src={url} alt={file.name ?? ''} draggable={false} onLoad={(e) => onRatio?.(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} /> : <span className="gal-load" />}
      <button type="button" className="gal-x" onClick={onRemove} aria-label={`Quitar ${file.name ?? 'la foto'}`} title="Quitar"><Icon name="close" size={14} /></button>
    </div>
  )
}

/**
 * Galería: varias fotos juntas en un solo bloque. Se elige cómo se reparten (fila, cuadrícula o mosaico),
 * se añaden varias a la vez y se reordenan arrastrándolas. Se guarda en `files` y `layout`.
 */
export default function GalleryBlock({ block, onChange, onRemove = null }) {
  const input = useRef(null)
  const fig = useRef(null)
  const frame = useRef(null)
  const [picked, setPicked] = useState(false) // galería seleccionada: marco, asas y barra
  const [ratios, setRatios] = useState({}) // proporciones leídas al cargar (para fotos guardadas sin medidas)
  const [live, setLive] = useState(null) // ancho (%) mientras se arrastra una asa
  const [drag, setDrag] = useState(null) // { from, over }
  const files = block.files ?? []
  const layout = block.layout ?? 'row'
  const align = block.align ?? 'left'
  const width = live ?? block.w ?? 100
  const ratioOf = (f) => (f.w && f.h ? f.w / f.h : ratios[f.id] ?? 4 / 3)
  const per = layout === 'grid' ? 3 : 0 // fotos por fila en la cuadrícula
  useEffect(() => {
    if (!picked) return undefined
    const away = (e) => { if (!fig.current?.contains(e.target)) setPicked(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [picked])
  // Arrastrar una asa de la esquina cambia el ancho de toda la galería (las fotos se escalan con ella)
  const startResize = (e, side) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const start = frame.current.offsetWidth
    const page = fig.current.clientWidth || 1
    const k = (side === 'l' ? -1 : 1) * (align === 'center' ? 2 : 1)
    let last = Math.round((start / page) * 100)
    const move = (ev) => { last = Math.min(100, Math.max(MIN_W, Math.round(((start + k * (ev.clientX - startX)) / page) * 100))); setLive(last) }
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); setLive(null); onChange({ ...block, w: last }) }
    setLive(last)
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
  }
  const add = async (e) => {
    const list = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    if (!list.length) return
    const saved = []
    for (const f of list) saved.push({ ...(await saveFile(f)), ...(await sizeOf(f)) }) // cada foto entra con sus proporciones
    onChange({ ...block, files: [...files, ...saved] })
  }
  // Si era la última foto, se borra el bloque entero
  const remove = (i) => { deleteFile(files[i].id).catch(() => {}); if (files.length === 1 && onRemove) onRemove(); else onChange({ ...block, files: files.filter((_, k) => k !== i) }) }
  const drop = () => {
    if (drag && drag.over != null && drag.over !== drag.from) {
      const next = [...files]
      const [x] = next.splice(drag.from, 1)
      next.splice(drag.over, 0, x)
      onChange({ ...block, files: next })
    }
    setDrag(null)
  }

  const thumb = (f, i) => (
    <Thumb key={f.id} file={f} ratio={ratioOf(f)} onRatio={(r) => setRatios((m) => (m[f.id] === r ? m : { ...m, [f.id]: r }))} onRemove={() => remove(i)} drag={drag?.from === i ? 'src' : drag?.over === i && drag.from !== i ? 'over' : null}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id); setDrag({ from: i, over: null }) }}
      onDragOver={(e) => { if (!drag) return; e.preventDefault(); if (drag.over !== i) setDrag({ ...drag, over: i }) }}
      onDrop={(e) => { e.preventDefault(); drop() }} onDragEnd={() => setDrag(null)} />
  )
  const addBtn = <button type="button" className="gal-add" onClick={() => input.current?.click()} aria-label="Añadir fotos" title="Añadir fotos"><Icon name="plus" size={22} /></button>

  return (
    <div className="gal-block">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={add} />
      {files.length === 0
        ? <button type="button" className="img-empty" onClick={() => input.current?.click()}><Icon name="img" size={26} /><span>Añadir fotos (puedes elegir varias)</span></button>
        : (
          <div ref={fig} className="gal-fig" style={{ justifyContent: JUSTIFY[align] }}>
            <div ref={frame} className={`gal-frame ${picked ? 'is-picked' : ''}`} style={{ width: `${width}%` }} onClick={() => setPicked(true)}>
              {layout === 'grid' ? (
                // cuadrícula: filas de tres, cada fila a la misma altura y cada foto con su proporción
                <div className="gal gal-grid">
                  {Array.from({ length: Math.ceil((files.length + 1) / per) }, (_, r) => (
                    <div key={r} className="gal-line">
                      {files.slice(r * per, r * per + per).map((f, k) => thumb(f, r * per + k))}
                      {r * per + per > files.length && <span className="gal-spacer" style={{ flex: `${(per - files.slice(r * per, r * per + per).length) * 1.33} 1 0` }} />}
                      {r * per + per > files.length && r * per <= files.length && addBtn}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`gal gal-${layout}`} style={layout === 'mosaic' ? { columnCount: files.length < 2 ? 1 : files.length < 5 ? 2 : 3 } : undefined}>
                  {files.map(thumb)}
                  {addBtn}
                </div>
              )}
              {picked && (
                <>
                  {['tl', 'tr', 'bl', 'br'].map((c) => <i key={c} className={`img-h img-h-${c}`} onPointerDown={(e) => startResize(e, c[1] === 'l' ? 'l' : 'r')} role="presentation" />)}
                  {live != null && <span className="img-pct">{live}%</span>}
                  <span className="img-bar" onPointerDown={(e) => e.stopPropagation()}>
                    {['left', 'center', 'right'].map((k) => (
                      <button key={k} type="button" className={`icon-btn ${align === k ? 'on' : ''}`} onClick={() => onChange({ ...block, align: k })} aria-label={ALIGN_LABEL[k]} aria-pressed={align === k} title={ALIGN_LABEL[k]}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d={ALIGN_PATH[k]} /></svg>
                      </button>
                    ))}
                    <i className="img-sep" />
                    {LAYOUTS.map(([k, l]) => <button type="button" key={k} className={`gal-chip ${layout === k ? 'on' : ''}`} onClick={() => onChange({ ...block, layout: k })} aria-pressed={layout === k}>{l}</button>)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  )
}
