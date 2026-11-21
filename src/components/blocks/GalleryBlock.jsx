import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { deleteFile, getFile, saveFile } from '../../lib/fileStore.js'

const LAYOUTS = [['row', 'Fila'], ['grid', 'Cuadrícula'], ['mosaic', 'Mosaico']]

/** Una foto de la galería (se lee del almacén de archivos) */
function Thumb({ file, onRemove, drag, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    let made = null
    setUrl(null)
    getFile(file.id).then((blob) => { if (blob && alive) { made = URL.createObjectURL(blob); setUrl(made) } }).catch(() => {})
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [file.id])
  return (
    <div className={`gal-item ${drag === 'src' ? 'is-drag' : ''} ${drag === 'over' ? 'is-over' : ''}`} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      {url ? <img src={url} alt={file.name ?? ''} draggable={false} /> : <span className="gal-load" />}
      <button type="button" className="gal-x" onClick={onRemove} aria-label={`Quitar ${file.name ?? 'la foto'}`} title="Quitar"><Icon name="close" size={14} /></button>
    </div>
  )
}

/**
 * Galería: varias fotos juntas en un solo bloque. Se elige cómo se reparten (fila, cuadrícula o mosaico),
 * se añaden varias a la vez y se reordenan arrastrándolas. Se guarda en `files` y `layout`.
 */
export default function GalleryBlock({ block, onChange }) {
  const input = useRef(null)
  const [drag, setDrag] = useState(null) // { from, over }
  const files = block.files ?? []
  const layout = block.layout ?? 'row'
  const add = async (e) => {
    const list = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    if (!list.length) return
    const saved = []
    for (const f of list) saved.push(await saveFile(f))
    onChange({ ...block, files: [...files, ...saved] })
  }
  const remove = (i) => { deleteFile(files[i].id).catch(() => {}); onChange({ ...block, files: files.filter((_, k) => k !== i) }) }
  const drop = () => {
    if (drag && drag.over != null && drag.over !== drag.from) {
      const next = [...files]
      const [x] = next.splice(drag.from, 1)
      next.splice(drag.over, 0, x)
      onChange({ ...block, files: next })
    }
    setDrag(null)
  }

  return (
    <div className="gal-block">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={add} />
      {files.length === 0
        ? <button type="button" className="img-empty" onClick={() => input.current?.click()}><Icon name="img" size={26} /><span>Añadir fotos (puedes elegir varias)</span></button>
        : (
          <>
            <div className="gal-bar" role="group" aria-label="Cómo se reparten las fotos">
              {LAYOUTS.map(([k, l]) => <button type="button" key={k} className={`gal-chip ${layout === k ? 'on' : ''}`} onClick={() => onChange({ ...block, layout: k })} aria-pressed={layout === k}>{l}</button>)}
            </div>
            <div className={`gal gal-${layout} gal-n${Math.min(files.length, 4)}`} style={layout === 'row' ? { gridTemplateColumns: `repeat(${files.length}, minmax(0, 1fr)) 56px` } : undefined}>
              {files.map((f, i) => (
                <Thumb key={f.id} file={f} onRemove={() => remove(i)} drag={drag?.from === i ? 'src' : drag?.over === i && drag.from !== i ? 'over' : null}
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id); setDrag({ from: i, over: null }) }}
                  onDragOver={(e) => { if (!drag) return; e.preventDefault(); if (drag.over !== i) setDrag({ ...drag, over: i }) }}
                  onDrop={(e) => { e.preventDefault(); drop() }} onDragEnd={() => setDrag(null)} />
              ))}
              <button type="button" className="gal-add" onClick={() => input.current?.click()} aria-label="Añadir fotos" title="Añadir fotos"><Icon name="plus" size={22} /></button>
            </div>
          </>
        )}
    </div>
  )
}
