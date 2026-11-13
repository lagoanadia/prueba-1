import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'

/** Deja solo enlaces http(s) o mailto; si falta el esquema se añade https:// */
export function cleanUrl(raw) {
  const v = String(raw ?? '').trim()
  if (!v) return ''
  if (/^(https?:|mailto:)/i.test(v)) return v
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return '' // otros esquemas (javascript:, data:…) no se aceptan
  return `https://${v}`
}
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

/** Enlace: una tarjeta con título y dirección que abre en otra pestaña. Vacío, pide la dirección. */
export default function LinkBlock({ block, onChange, focus, onFocused }) {
  const [editing, setEditing] = useState(!block.url)
  const [url, setUrl] = useState(block.url ?? '')
  const [title, setTitle] = useState(block.title ?? '')
  const first = useRef(null)
  useEffect(() => { if (focus) { setEditing(true); onFocused?.() } }, [focus])
  useEffect(() => { if (editing) first.current?.focus() }, [editing])
  const save = () => {
    const u = cleanUrl(url)
    if (!u) { if (block.url) setEditing(false); return }
    onChange({ ...block, url: u, title: title.trim() })
    setUrl(u)
    setEditing(false)
  }
  const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); save() } else if (e.key === 'Escape' && block.url) { setUrl(block.url); setTitle(block.title ?? ''); setEditing(false) } }

  if (editing) {
    return (
      <div className="lk lk-edit">
        <Icon name="link" size={18} />
        <input ref={first} placeholder="Pega o escribe un enlace" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={onKey} aria-label="Dirección del enlace" />
        <input placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKey} aria-label="Título del enlace" />
        <button type="button" className="icon-btn" onClick={save} aria-label="Guardar el enlace" title="Guardar"><Icon name="check" size={18} /></button>
      </div>
    )
  }
  return (
    <div className="lk">
      <a href={block.url} target="_blank" rel="noopener noreferrer" className="lk-card">
        <Icon name="link" size={18} />
        <span className="lk-t"><b>{block.title || host(block.url)}</b><small>{block.url}</small></span>
        <Icon name="arrow" size={16} />
      </a>
      <button type="button" className="icon-btn lk-pen" onClick={() => setEditing(true)} aria-label="Editar el enlace" title="Editar"><Icon name="pen" size={16} /></button>
    </div>
  )
}
