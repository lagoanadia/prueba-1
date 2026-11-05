import { useState } from 'react'

const TYPES = { pdf: { label: 'PDF', color: '#E84855' }, doc: { label: 'Doc', color: '#3185FC' }, video: { label: 'Vídeo', color: '#EFABFF' }, web: { label: 'Web', color: '#3DDC97' } }
const DEFAULT = []
// Solo enlaces http(s): evita que un enlace guardado ejecute código (p. ej. "javascript:")
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : null)

/** Recursos: enlaces útiles (PDF, documentación, vídeos, webs). L: + añadir. */
export default function Resources({ size, data, update }) {
  const list = data.resources ?? DEFAULT
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState('web')

  const add = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    update((d) => ({ ...d, resources: [...(d.resources ?? DEFAULT), { id: crypto.randomUUID(), type, title: title.trim(), url: url.trim() }] }))
    setTitle('')
    setUrl('')
  }
  const remove = (id) => update((d) => ({ ...d, resources: (d.resources ?? DEFAULT).filter((r) => r.id !== id) }))

  if (size === 'S') return <div className="w-center"><b className="big">{list.length}</b><span className="w-hint">recursos</span></div>

  return (
    <>
      <ul className="resources">
        {(size === 'M' ? list.slice(0, 3) : list).map((r) => {
          const href = safeUrl(r.url)
          const content = <><span className="res-type" style={{ background: TYPES[r.type].color }}>{TYPES[r.type].label}</span><span className="w-ellipsis">{r.title}</span></>
          return (
            <li key={r.id}>
              {href ? <a className="res" href={href} target="_blank" rel="noreferrer noopener">{content}</a> : <span className="res">{content}</span>}
              {size === 'L' && <button className="prio-x" onClick={() => remove(r.id)} aria-label="Quitar">×</button>}
            </li>
          )
        })}
        {list.length === 0 && <li className="w-hint">Sin recursos todavía</li>}
      </ul>
      {size === 'L' && (
        <form className="w-form" onSubmit={add}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ flex: 'none' }}>
            {Object.entries(TYPES).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
          </select>
          <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          <input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} />
          <button className="mini mini-primary" disabled={!title.trim()} aria-label="Añadir">+</button>
        </form>
      )}
    </>
  )
}
