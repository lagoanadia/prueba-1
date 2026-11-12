import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { deleteFile, getFile, saveFile } from '../lib/fileStore.js'
import PdfPages from './PdfPages.jsx'

/**
 * Visor de un archivo (PDF, imagen…) dentro de un iframe, con botón para subirlo o cambiarlo.
 * `file` = { id, name, type } o null. `onChange(file|null)` guarda la referencia en los datos.
 */
export default function FileFrame({ file, onChange, label = 'Subir archivo', extra = null, onPickText }) {
  const [url, setUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [plain, setPlain] = useState(false) // si el PDF no se puede dibujar, se usa el visor del navegador
  const input = useRef(null)

  useEffect(() => {
    let cancelled = false
    let made = null
    setUrl(null); setBlob(null); setPlain(false)
    if (file?.id) getFile(file.id).then((b) => { if (b && !cancelled) { made = URL.createObjectURL(b); setUrl(made); setBlob(b) } }).catch(() => {})
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made) }
  }, [file?.id])

  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (file?.id) deleteFile(file.id).catch(() => {})
    onChange(await saveFile(f))
  }
  const remove = () => { if (file?.id) deleteFile(file.id).catch(() => {}); onChange(null) }

  return (
    <div className="card file-frame">
      <div className="file-bar">
        <Icon name={file?.type?.startsWith('image/') ? 'eye' : 'pdf'} size={20} color="#E84855" />
        <b className="w-ellipsis">{file?.name ?? 'Sin archivo'}</b>
        <span style={{ flex: 1 }} />
        {extra}
        {!extra && <button className="icon-btn" onClick={() => input.current?.click()} aria-label={file ? 'Cambiar archivo' : label} title={file ? 'Cambiar archivo' : label}><Icon name="upload" size={20} /></button>}
        {file && <button className="icon-btn" onClick={remove} aria-label="Quitar archivo" title="Quitar archivo"><Icon name="trash" size={20} /></button>}
        <input ref={input} type="file" accept="application/pdf,image/*" hidden onChange={pick} />
      </div>
      {url
        ? (file.type?.startsWith('image/') ? <img className="file-img" src={url} alt={file.name} /> : blob && !plain ? <PdfPages blob={blob} name={file.name} onPickText={onPickText} onFallback={() => setPlain(true)} /> : <iframe className="file-view" src={url} title={file.name} />)
        : <button className="file-empty" onClick={() => input.current?.click()}><Icon name="upload" size={36} /><span>{label}</span></button>}
    </div>
  )
}
