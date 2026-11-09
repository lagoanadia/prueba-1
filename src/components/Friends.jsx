import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { addFriend, answerRequest, getFriends, notifyFriendsChanged, removeFriend, setUsername } from '../services/friendsService.js'

const Ctx = createContext(null)
const clean = (v) => v.toLowerCase().replace(/[^a-z0-9._]/g, '')

/** Estado compartido de usuario, peticiones y amigos, para poder pintar cada parte en su sitio. */
export function FriendsProvider({ children }) {
  const [state, setState] = useState(null) // { username, friends, incoming, outgoing }
  const [name, setName] = useState('')
  const [friend, setFriend] = useState('')
  const [msg, setMsg] = useState(null) // { text, ok }
  const [busy, setBusy] = useState(false)

  useEffect(() => { getFriends().then((s) => { setState(s); setName(s.username ?? '') }).catch(() => setState({ username: null, friends: [], incoming: [], outgoing: [] })) }, [])

  const run = (fn, after) => async (e) => {
    e?.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const s = await fn()
      setState(s)
      notifyFriendsChanged(s)
      after?.(s)
    } catch (err) { setMsg({ text: err.message }) } finally { setBusy(false) }
  }
  return <Ctx.Provider value={{ state, name, setName, friend, setFriend, msg, setMsg, busy, run }}>{children}</Ctx.Provider>
}

/** Tu nombre de usuario (va encima del avatar). */
export function UsernameBox() {
  const { state, name, setName, busy, run } = useContext(Ctx)
  if (!state) return null
  return (
    <form className="friends-row" onSubmit={run(() => setUsername(name))}>
      <span className="friends-at">@</span>
      <input value={name} onChange={(e) => setName(clean(e.target.value))} placeholder="tu_nombre" maxLength={20} aria-label="Tu nombre de usuario" />
      <button className="pill pill-on" disabled={busy || name.length < 3 || name === state.username}>{state.username ? 'Cambiar' : 'Guardar'}</button>
    </form>
  )
}

/** Peticiones de amistad, añadir amigos por su nombre y ver sus personajes. */
export function FriendsBox() {
  const { state, friend, setFriend, setMsg, msg, busy, run } = useContext(Ctx)
  const requestsRef = useRef(null)
  const hasRequests = state?.incoming.length > 0
  // Si hay peticiones al entrar, bajar hasta ellas
  useEffect(() => { if (hasRequests) requestsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [hasRequests])
  if (!state) return null
  const sent = (s) => { setMsg({ ok: true, text: s.result === 'friends' ? '¡Ya sois amigos!' : `Petición enviada a @${friend}` }); setFriend('') }

  return (
    <section className="friends">
      {state.incoming.length > 0 && (
        <ul ref={requestsRef} className="friend-requests" aria-label="Peticiones de amistad">
          {state.incoming.map((u) => (
            <li key={u.username} className="card">
              <Avatar avatar={u.avatar} size={48} />
              <span><b>@{u.username}</b> quiere ser tu amigo</span>
              <button className="pill pill-on" disabled={busy} onClick={run(() => answerRequest(u.username, true))}>Aceptar</button>
              <button className="pill" disabled={busy} onClick={run(() => answerRequest(u.username, false))}>Rechazar</button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="friends-h">Amigos</h3>
      {state.username ? (
        <form className="friends-row" onSubmit={run(() => addFriend(friend), sent)}>
          <span className="friends-at">@</span>
          <input value={friend} onChange={(e) => setFriend(clean(e.target.value))} placeholder="nombre de tu amigo" maxLength={20} aria-label="Nombre de usuario del amigo" />
          <button className="pill pill-soft" disabled={busy || friend.length < 3}>Añadir</button>
        </form>
      ) : <p className="muted friends-hint">Elige tu nombre para añadir amigos</p>}
      {msg && <p className={msg.ok ? 'friends-ok' : 'friends-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}

      <ul className="friends-list">
        {state.friends.map((f, i) => (
          <li key={f.username} style={{ '--i': i }}>
            <Avatar avatar={f.avatar} size={72} />
            <span>@{f.username}</span>
            <button className="prio-x" onClick={run(() => removeFriend(f.username))} aria-label={`Quitar a @${f.username}`}>×</button>
          </li>
        ))}
        {state.outgoing.map((u) => (
          <li key={u} className="is-pending">
            <span className="friends-wait">…</span>
            <span>@{u}</span>
            <span className="muted friends-tag">Pendiente</span>
            <button className="prio-x" onClick={run(() => removeFriend(u))} aria-label={`Cancelar petición a @${u}`}>×</button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Todo junto (móvil): usuario + amigos. */
export default function Friends() {
  return <FriendsProvider><UsernameBox /><FriendsBox /></FriendsProvider>
}
