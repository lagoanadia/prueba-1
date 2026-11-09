import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
import { getFriends } from '../services/friendsService.js'
import { social, socialChanged } from '../services/socialService.js'

/**
 * Botón «Compartir» para UNA cosa (una receta, unos apuntes, una nota…).
 * Abre una hoja para elegir el feed o amigos concretos y añadir un mensaje.
 * kind: 'recipe' | 'doc' | 'good' | 'note' · data: lo que verá tu amigo · title: cómo se llama
 */
export default function ShareButton({ kind, data, title, className = 'pill', label = 'Compartir' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={`share-btn ${className}`} onClick={(e) => { e.stopPropagation(); setOpen(true) }} onPointerDown={(e) => e.stopPropagation()} title="Compartir">
        <Icon name="arrow" size={14} /> {label}
      </button>
      {open && <ShareSheet kind={kind} data={data} title={title} onClose={() => setOpen(false)} />}
    </>
  )
}

function ShareSheet({ kind, data, title, onClose }) {
  const [friends, setFriends] = useState(null)
  const [feed, setFeed] = useState(false)
  const [to, setTo] = useState([])
  const [text, setText] = useState('')
  const [msg, setMsg] = useState(null)
  useEffect(() => { getFriends().then((s) => setFriends(s.friends ?? [])).catch(() => setFriends([])) }, [])
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const toggle = (u) => setTo((t) => (t.includes(u) ? t.filter((x) => x !== u) : [...t, u]))
  const send = async () => {
    try {
      const r = await social('post', { kind, data, text, to: feed ? 'feed' : to })
      socialChanged()
      setMsg({ ok: true, text: feed ? 'Compartido en el feed' : `Enviado a ${to.map((u) => '@' + u).join(', ')}`, unlocked: r.unlocked })
      setTimeout(onClose, r.unlocked ? 2600 : 1300)
    } catch (e) { setMsg({ text: e.message }) }
  }
  const ready = feed || to.length > 0

  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Compartir">
      <div className="popup-backdrop" onClick={onClose} />
      <div className="popup-panel share-sheet">
        <b className="name-dialog-title">Compartir «{title}»</b>
        <button type="button" className={`share-feed ${feed ? 'on' : ''}`} onClick={() => setFeed(!feed)} aria-pressed={feed}>
          <span><b>En el feed</b><span className="muted">Lo ven todos tus amigos y pueden reaccionar</span></span>
          <span className={`toggle-dot ${feed ? 'on' : ''}`} />
        </button>
        {!feed && (
          <>
            <span className="w-hint">O solo a</span>
            {friends === null ? <span className="muted">…</span> : friends.length === 0 ? <span className="muted">Añade amigos en Amigos para compartir con ellos</span> : (
              <div className="share-people">
                {friends.map((f) => (
                  <button type="button" key={f.username} className={`share-person ${to.includes(f.username) ? 'on' : ''}`} onClick={() => toggle(f.username)} aria-pressed={to.includes(f.username)}>
                    <Avatar avatar={f.avatar} size={48} /><span>@{f.username}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <input className="pill-input" placeholder="Añade un mensaje (opcional)" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
        {msg && <p className={msg.ok ? 'friends-ok' : 'friends-error'} role="status">{msg.text}{msg.unlocked && <><br />¡Has encontrado algo! Un brote para tu avatar.</>}</p>}
        <button className="pill pill-on share-send" disabled={!ready || msg?.ok} onClick={send}>{feed ? 'Compartir en el feed' : to.length ? `Enviar a ${to.length === 1 ? '@' + to[0] : to.length + ' amigos'}` : 'Elige a quién'}</button>
      </div>
    </div>,
    document.body,
  )
}
