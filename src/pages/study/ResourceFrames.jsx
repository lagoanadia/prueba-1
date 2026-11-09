import { useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import FileFrame from '../../components/FileFrame.jsx'
import { deleteFile, saveFile } from '../../lib/fileStore.js'
import { cleanUrl, embedOf } from './helpers.js'

/**
 * Recursos de una asignatura (o de una unidad si llega unitId): enlaces o archivos subidos,
 * mostrados como un iframe. Algunas webs no dejan verse dentro de otra página: siempre hay botón para abrirlas.
 */
export default function ResourceFrames({ data, update, subjectId, unitId = null }) {
  const list = (data.resources ?? []).filter((r) => r.subjectId === subjectId && (unitId ? r.unitId === unitId : true))
  const [text, setText] = useState('')
  const [bad, setBad] = useState(false)
  const input = useRef(null)

  const addLink = (e) => {
    e.preventDefault()
    const url = cleanUrl(text)
    if (!url) { setBad(true); return }
    update((d) => ({ ...d, resources: [...(d.resources ?? []), { id: crypto.randomUUID(), title: new URL(url).hostname.replace(/^www\./, ''), url, subjectId, unitId }] }))
    setText('')
    setBad(false)
  }
  const addFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const file = await saveFile(f)
    update((d) => ({ ...d, resources: [...(d.resources ?? []), { id: crypto.randomUUID(), title: f.name, file, subjectId, unitId }] }))
  }
  const remove = (r) => { if (r.file?.id) deleteFile(r.file.id).catch(() => {}); update((d) => ({ ...d, resources: d.resources.filter((x) => x.id !== r.id) })) }

  return (
    <div className="res-frames">
      <form className="res-add" onSubmit={addLink}>
        <input className="line-input" placeholder="Pega un enlace" value={text} onChange={(e) => { setText(e.target.value); setBad(false) }} maxLength={300} aria-invalid={bad} />
        <button className="icon-btn on" disabled={!text.trim()} aria-label="Añadir enlace" title="Añadir enlace"><Icon name="link" size={20} /></button>
        <button type="button" className="icon-btn" onClick={() => input.current?.click()} aria-label="Subir archivo" title="Subir archivo"><Icon name="upload" size={20} /></button>
        <input ref={input} type="file" accept="application/pdf,image/*" hidden onChange={addFile} />
        {bad && <span className="error" role="alert">Ese enlace no es válido</span>}
      </form>
      <div className="res-grid">
        {list.map((r) => (r.file
          ? <FileFrame key={r.id} file={r.file} onChange={(f) => { if (!f) remove(r) }} />
          : <LinkFrame key={r.id} r={r} onRemove={() => remove(r)} />))}
        {list.length === 0 && <p className="muted">Sin recursos todavía.</p>}
      </div>
    </div>
  )
}

/** Enlace mostrado dentro de la app. Los vídeos (YouTube, Vimeo) se ven en 16:9; el resto, como página. */
function LinkFrame({ r, onRemove }) {
  const { src, kind } = embedOf(r.url)
  const video = kind === 'video'
  return (
    <div className="card file-frame">
      <div className="file-bar">
        <Icon name={video ? 'eye' : 'link'} size={20} color={video ? '#E84855' : '#3185FC'} />
        <b className="w-ellipsis">{r.title}</b>
        <span style={{ flex: 1 }} />
        <a className="icon-btn" href={r.url} target="_blank" rel="noreferrer noopener" aria-label={`Abrir ${r.title} en otra pestaña`} title="Abrir en otra pestaña"><Icon name="arrow" size={20} /></a>
        <button className="icon-btn" onClick={onRemove} aria-label="Quitar" title="Quitar"><Icon name="trash" size={20} /></button>
      </div>
      <iframe className={`file-view ${video ? 'file-video' : ''}`} src={src} title={r.title} loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture; encrypted-media; clipboard-write"
        allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" />
    </div>
  )
}
