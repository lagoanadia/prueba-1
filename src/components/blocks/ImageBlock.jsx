import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { deleteFile, getFile, saveFile } from '../../lib/fileStore.js'

const MIN_W = 10 // % mínimo del ancho de la página
const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' }
const ALIGN_PATH = { left: 'M4 6h16M4 12h10M4 18h14', center: 'M4 6h16M7 12h10M5 18h14', right: 'M4 6h16M10 12h10M6 18h14' }
const ALIGN_LABEL = { left: 'Alinear a la izquierda', center: 'Centrar', right: 'Alinear a la derecha' }

/** Foto: se sube desde el dispositivo (se guarda en el navegador, como los PDF). */
export default function ImageBlock({ block, onChange }) {
  const [url, setUrl] = useState(null)
  const input = useRef(null)
  const fig = useRef(null)
  const frame = useRef(null)
  const [picked, setPicked] = useState(false) // foto seleccionada: marco, asas y barra
  const [live, setLive] = useState(null) // ancho (%) mientras se arrastra una asa
  useEffect(() => {
    let alive = true
    let made = null
    setUrl(null)
    if (block.file?.id) getFile(block.file.id).then((blob) => { if (blob && alive) { made = URL.createObjectURL(blob); setUrl(made) } }).catch(() => {})
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [block.file?.id])
  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (block.file?.id) deleteFile(block.file.id).catch(() => {})
    onChange({ ...block, file: await saveFile(f) })
  }
  // Seleccionada hasta que pulses fuera
  useEffect(() => {
    if (!picked) return undefined
    const away = (e) => { if (!fig.current?.contains(e.target)) setPicked(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [picked])
  const align = block.align ?? 'left'
  const width = live ?? block.w // % del ancho de la página (sin valor: tamaño natural)
  // Arrastrar una asa de la esquina: cambia el ancho (las de la izquierda al revés; centrada crece por los dos lados)
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
  const remove = () => { if (block.file?.id) deleteFile(block.file.id).catch(() => {}); onChange({ ...block, file: null }) }

  return (
    <div className="img-block">
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      {url
        ? (
          <figure ref={fig} className="img-fig" style={{ justifyContent: JUSTIFY[align] }}>
            <div ref={frame} className={`img-frame ${picked ? 'is-picked' : ''}`} style={width ? { width: `${width}%` } : undefined} onClick={() => setPicked(true)}>
              <img src={url} alt={block.file?.name ?? ''} draggable={false} />
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
                    <button type="button" className="icon-btn" onClick={() => input.current?.click()} aria-label="Cambiar la foto" title="Cambiar"><Icon name="upload" size={18} /></button>
                    <button type="button" className="icon-btn" onClick={remove} aria-label="Quitar la foto" title="Quitar"><Icon name="trash" size={18} /></button>
                  </span>
                </>
              )}
            </div>
          </figure>
        )
        : <button className="img-empty" onClick={() => input.current?.click()}><Icon name="img" size={26} /><span>Añadir foto</span></button>}
    </div>
  )
}
