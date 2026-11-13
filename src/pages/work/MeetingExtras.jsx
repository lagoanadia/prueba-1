import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { docTitle } from './docs.js'

const clean = (raw) => {
  const t = raw.trim()
  if (!t) return null
  try { const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); return u.hostname.includes('.') ? u.href : null } catch { return null }
}
const nameOf = (url) => { try { const u = new URL(url); const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() ?? ''); return last && /\.\w{2,4}$/.test(last) ? last : u.hostname.replace(/^www\./, '') } catch { return url } }
const isPdf = (url) => /\.pdf(\?|#|$)/i.test(url)

/**
 * Notas, enlaces (web, PDF…) y documentos del proyecto para una reunión: lo que quieres tener a mano al entrar.
 * value = { note, links: [{ id, url }], docs: [docId] }
 */
export default function MeetingExtras({ value, onChange, docs = [] }) {
  const [url, setUrl] = useState('')
  const [bad, setBad] = useState(false)
  const links = value.links ?? []
  const picked = value.docs ?? []
  const add = () => {
    const u = clean(url)
    if (!u) { setBad(Boolean(url.trim())); return }
    if (!links.some((l) => l.url === u)) onChange({ ...value, links: [...links, { id: crypto.randomUUID(), url: u }] })
    setUrl(''); setBad(false)
  }
  return (
    <div className="mx">
      <textarea className="mx-note" rows={2} maxLength={800} value={value.note ?? ''} onChange={(e) => onChange({ ...value, note: e.target.value })} placeholder="Notas: qué hay que mirar, qué preguntar…" aria-label="Notas de la reunión" />
      {(links.length > 0 || picked.length > 0) && (
        <div className="mx-chips">
          {links.map((l) => (
            <span key={l.id} className="mx-chip">
              <a href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}><Icon name={isPdf(l.url) ? 'pdf' : 'link'} size={14} />{nameOf(l.url)}</a>
              <button type="button" onClick={() => onChange({ ...value, links: links.filter((x) => x.id !== l.id) })} aria-label={`Quitar ${nameOf(l.url)}`}><Icon name="close" size={10} strokeWidth={3} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="mx-add">
        <Icon name="link" size={16} />
        <input value={url} onChange={(e) => { setUrl(e.target.value); setBad(false) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Pega un enlace (web, PDF…)" aria-label="Añadir enlace" className={bad ? 'is-bad' : ''} />
        <button type="button" className="pill pill-sm" onClick={add} disabled={!url.trim()}>Añadir</button>
      </div>
      {bad && <span className="wk-err" role="alert">Ese enlace no parece válido</span>}
      {docs.length > 0 && (
        <div className="mx-docs" role="group" aria-label="Documentos del proyecto">
          <span className="mx-hint">Documentos del proyecto</span>
          {docs.map((d) => {
            const on = picked.includes(d.id)
            return <button type="button" key={d.id} className={`mx-doc ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange({ ...value, docs: on ? picked.filter((x) => x !== d.id) : [...picked, d.id] })}><Icon name="doc" size={13} />{docTitle(d)}</button>
          })}
        </div>
      )}
    </div>
  )
}
