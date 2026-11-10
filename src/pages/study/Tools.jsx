import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import SiteIcon from '../../components/SiteIcon.jsx'
import { cleanUrl } from './helpers.js'

/** Herramientas: enlaces como iconos grandes de la app (Drive, Vercel…). Sin nombre; el icono sale del propio enlace. */
export default function Tools({ data, update, bare = false }) {
  const tools = (data.tools ?? []).filter((t) => cleanUrl(t.url))
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [bad, setBad] = useState(false)

  const add = (e) => {
    e.preventDefault()
    const url = cleanUrl(text)
    if (!url) { setBad(true); return }
    update((d) => ({ ...d, tools: [...(d.tools ?? []), { id: crypto.randomUUID(), name: new URL(url).hostname.replace(/^www\./, ''), url }] }))
    setText('')
    setBad(false)
    setAdding(false)
  }
  const remove = (id) => update((d) => ({ ...d, tools: d.tools.filter((t) => t.id !== id) }))

  return (
    <div className="tools">
      {!bare && <h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Herramientas</h2>}
      <div className="tool-grid">
        {tools.map((t) => (
          <div key={t.id} className="tool">
            <a href={t.url} target="_blank" rel="noreferrer noopener" aria-label={t.name} title={t.name}>
              <SiteIcon url={t.url} name={t.name} />
            </a>
            <button className="tool-x" onClick={() => remove(t.id)} aria-label={`Quitar ${t.name}`}><Icon name="close" size={14} color="#FFFFFF" /></button>
          </div>
        ))}
        <button className="tool tool-add" onClick={() => setAdding(!adding)} aria-label="Añadir herramienta" aria-expanded={adding} title="Añadir herramienta"><Icon name="plus" size={30} /></button>
      </div>
      {adding && (
        <form className="tool-form" onSubmit={add}>
          <input className="line-input" autoFocus placeholder="Pega el enlace (drive.google.com…)" value={text} onChange={(e) => { setText(e.target.value); setBad(false) }} maxLength={200} aria-invalid={bad} />
          <button className="icon-btn on" aria-label="Añadir" disabled={!text.trim()}><Icon name="check" size={20} /></button>
          {bad && <span className="error" role="alert">Ese enlace no es válido</span>}
        </form>
      )}
    </div>
  )
}
