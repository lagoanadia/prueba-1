import { useState } from 'react'

const TYPES = { pdf: { label: 'PDF', color: '#E84855' }, doc: { label: 'Doc', color: '#3185FC' }, video: { label: 'Vídeo', color: '#EFABFF' }, web: { label: 'Web', color: '#3DDC97' } }
// Solo enlaces http(s): un enlace guardado nunca puede ejecutar código ("javascript:")
export const safeUrl = (u) => (/^https?:\/\//i.test(u ?? '') ? u : null)

/** Recursos de una asignatura (o de una unidad si llega unitId) en tarjetas, con formulario para añadir. */
export default function ResourceCards({ data, update, subjectId, unitId = null }) {
  const list = (data.resources ?? []).filter((r) => r.subjectId === subjectId && (unitId ? r.unitId === unitId : true))
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState('web')

  const add = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    update((d) => ({ ...d, resources: [...(d.resources ?? []), { id: crypto.randomUUID(), type, title: title.trim(), url: url.trim(), subjectId, unitId }] }))
    setTitle('')
    setUrl('')
  }
  const remove = (id) => update((d) => ({ ...d, resources: d.resources.filter((r) => r.id !== id) }))

  return (
    <>
      <div className="res-cards">
        {list.map((r, i) => {
          const href = safeUrl(r.url)
          const body = <><span className="res-type" style={{ background: TYPES[r.type]?.color }}>{TYPES[r.type]?.label}</span><b>{r.title}</b>{href && <span className="muted res-host">{new URL(href).hostname}</span>}</>
          return (
            <div key={r.id} className="card res-card" style={{ '--i': i }}>
              {href ? <a href={href} target="_blank" rel="noreferrer noopener">{body}</a> : <span>{body}</span>}
              <button className="prio-x" onClick={() => remove(r.id)} aria-label="Quitar">×</button>
            </div>
          )
        })}
        {list.length === 0 && <p className="muted">Sin recursos todavía</p>}
      </div>
      <form className="w-form study-add" onSubmit={add}>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ flex: 'none' }} aria-label="Tipo">
          {Object.entries(TYPES).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
        </select>
        <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
        <input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} />
        <button className="mini mini-primary" disabled={!title.trim()} aria-label="Añadir recurso">+</button>
      </form>
    </>
  )
}
