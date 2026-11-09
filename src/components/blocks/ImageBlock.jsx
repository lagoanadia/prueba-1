import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { deleteFile, getFile, saveFile } from '../../lib/fileStore.js'

/** Foto: se sube desde el dispositivo (se guarda en el navegador, como los PDF). */
export default function ImageBlock({ block, onChange }) {
  const [url, setUrl] = useState(null)
  const input = useRef(null)
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
  const remove = () => { if (block.file?.id) deleteFile(block.file.id).catch(() => {}); onChange({ ...block, file: null }) }

  return (
    <div className="img-block">
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      {url
        ? (
          <figure>
            <img src={url} alt={block.file?.name ?? ''} />
            <span className="img-tools">
              <button className="icon-btn" onClick={() => input.current?.click()} aria-label="Cambiar la foto" title="Cambiar"><Icon name="upload" size={18} /></button>
              <button className="icon-btn" onClick={remove} aria-label="Quitar la foto" title="Quitar"><Icon name="trash" size={18} /></button>
            </span>
          </figure>
        )
        : <button className="img-empty" onClick={() => input.current?.click()}><Icon name="img" size={26} /><span>Añadir foto</span></button>}
    </div>
  )
}
