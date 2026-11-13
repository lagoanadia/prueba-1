import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { getFriends } from '../../services/friendsService.js'
import { useShared } from './SharedCtx.js'

const LIVE_MS = 20000 // "está editando" si guardó hace menos de esto
const when = (iso) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Ventana pequeña centrada (Esc o fuera = cerrar). */
function Popup({ title, onClose, children }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label={title}>
      <div className="popup-backdrop" onClick={onClose} />
      <div className="popup-panel sh-panel">
        <header className="area-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button></header>
        {children}
      </div>
    </div>,
    document.body
  )
}

/**
 * Barra de un proyecto compartido: quién está, quién edita ahora, versión actual,
 * guardar versión, historial de versiones (icono de reloj) e invitar amigos.
 */
export default function SharedBar({ projectId }) {
  const sh = useShared()
  const meta = sh.meta(projectId)
  const [panel, setPanel] = useState(null) // 'save' | 'history' | 'invite'
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [friends, setFriends] = useState([])
  const [picked, setPicked] = useState([])
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force((x) => x + 1), 5000); return () => clearInterval(t) }, []) // refresca "está editando"
  useEffect(() => { if (panel === 'invite') getFriends().then((r) => setFriends(r.friends ?? [])).catch(() => {}) }, [panel])
  if (!meta) return null

  const versions = [...meta.versions].reverse()
  const current = versions[0]?.n ?? 0
  const editing = meta.lastEdit && !meta.lastEdit.you && Date.now() - new Date(meta.lastEdit.at).getTime() < LIVE_MS ? meta.lastEdit.by : null
  const inProject = new Set(meta.members.map((m) => m.username))
  const close = () => { setPanel(null); setErr(''); setNote(''); setPicked([]) }
  const run = async (fn) => { setBusy(true); setErr(''); try { await fn(); close() } catch (e) { setErr(e.message) } finally { setBusy(false) } }

  return (
    <div className="sh-bar">
      <div className="sh-members" aria-label="Personas del proyecto">
        {meta.members.map((m) => <span key={m.username} className="sh-member" title={`@${m.username}${m.owner ? ' · creó el proyecto' : ''}`}><Avatar avatar={m.avatar} size={30} /></span>)}
        {meta.mine && <button className="icon-btn sh-add" onClick={() => setPanel('invite')} aria-label="Invitar a un amigo" title="Invitar"><Icon name="plus" size={16} /></button>}
      </div>
      {editing && <span className="sh-live" role="status"><i />@{editing} está editando</span>}
      <span className="sh-grow" />
      <span className="sh-ver" title={meta.dirty ? 'Hay cambios sin guardar como versión' : 'Todo guardado en la última versión'}>
        {current ? `Versión ${current}` : 'Sin versiones'}{meta.dirty && <i className="sh-dirty" aria-label="Cambios sin guardar como versión" />}
      </span>
      <button className="pill sh-save" onClick={() => setPanel('save')}><Icon name="check" size={16} color="#fff" />Guardar versión</button>
      <button className="w-history" onClick={() => setPanel('history')} aria-label={`Historial de versiones (${versions.length})`} title="Historial de versiones">
        <Icon name="history" size={18} />{versions.length > 0 && <span className="w-history-n">{versions.length}</span>}
      </button>
      {sh.error && <span className="wk-err" role="alert">{sh.error}</span>}

      {panel === 'save' && (
        <Popup title={`Guardar como versión ${current + 1}`} onClose={close}>
          <input className="sh-note" autoFocus value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="¿Qué habéis cambiado? (opcional)" aria-label="Nota de la versión"
            onKeyDown={(e) => e.key === 'Enter' && !busy && run(() => sh.saveVersion(projectId, note))} />
          {err && <p className="wk-err" role="alert">{err}</p>}
          <div className="sh-actions"><button className="pill sh-save" disabled={busy} onClick={() => run(() => sh.saveVersion(projectId, note))}>Guardar versión {current + 1}</button></div>
        </Popup>
      )}
      {panel === 'history' && (
        <Popup title="Versiones" onClose={close}>
          {versions.length === 0 && <p className="w-hint">Todavía no hay versiones. Guarda una cuando queráis dejar una foto del proyecto.</p>}
          <ul className="sh-versions">
            {versions.map((v, i) => (
              <li key={v.n}>
                <span className={`sh-dot ${i === 0 ? 'on' : ''}`} />
                <div>
                  <b>Versión {v.n}</b>{i === 0 && <span className="sh-tag">actual</span>}
                  <div className="sh-vnote">{v.note || 'Sin nota'}</div>
                  <div className="w-hint">@{v.by} · {when(v.at)}</div>
                </div>
                {i !== 0 && <button className="pill" disabled={busy} onClick={() => window.confirm(`¿Volver a la versión ${v.n}? Lo de ahora se guarda como versión por si quieres recuperarlo.`) && run(() => sh.restore(projectId, v.n))}>Restaurar</button>}
              </li>
            ))}
          </ul>
          {err && <p className="wk-err" role="alert">{err}</p>}
        </Popup>
      )}
      {panel === 'invite' && (
        <Popup title="Invitar a un amigo" onClose={close}>
          <div className="wk-friends">
            {friends.filter((f) => !inProject.has(f.username)).map((f) => (
              <button type="button" key={f.username} className={`wk-friend ${picked.includes(f.username) ? 'on' : ''}`} aria-pressed={picked.includes(f.username)}
                onClick={() => setPicked(picked.includes(f.username) ? picked.filter((x) => x !== f.username) : [...picked, f.username])}><Avatar avatar={f.avatar} size={22} />{f.username}</button>
            ))}
            {friends.filter((f) => !inProject.has(f.username)).length === 0 && <span className="muted">No queda nadie más a quien invitar</span>}
          </div>
          {err && <p className="wk-err" role="alert">{err}</p>}
          <div className="sh-actions"><button className="pill sh-save" disabled={busy || !picked.length} onClick={() => run(() => sh.invite(projectId, picked))}>Invitar</button></div>
        </Popup>
      )}
    </div>
  )
}
