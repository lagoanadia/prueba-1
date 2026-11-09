import { createContext, useContext, useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'
import { addFriend, getFriends, removeFriend, setUsername } from '../services/friendsService.js'


const Ctx = createContext(null)
const clean = (v) => v.toLowerCase().replace(/[^a-z0-9._]/g, '')

/** Estado compartido de usuario y amigos, para poder pintar cada parte en su sitio. */
export function FriendsProvider({ children }) {
  const [state, setState] = useState(null) // { username, friends }
  const [name, setName] = useState('')
  const [friend, setFriend] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { getFriends().then((s) => { setState(s); setName(s.username ?? '') }).catch(() => setState({ username: null, friends: [] })) }, [])

  const run = (fn, after) => async (e) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try { setState(await fn()); after?.() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Ctx.Provider value={{ state, name, setName, friend, setFriend, error, busy, run }}>{children}</Ctx.Provider>
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

/** Añadir amigos por su nombre y ver sus personajes. */
export function FriendsBox() {
  const { state, friend, setFriend, error, busy, run } = useContext(Ctx)
  if (!state) return null
  return (
    <section className="friends">
      <h3 className="friends-h">Amigos</h3>
      {state.username ? (
        <form className="friends-row" onSubmit={run(() => addFriend(friend), () => setFriend(''))}>
          <span className="friends-at">@</span>
          <input value={friend} onChange={(e) => setFriend(clean(e.target.value))} placeholder="nombre de tu amigo" maxLength={20} aria-label="Nombre de usuario del amigo" />
          <button className="pill pill-soft" disabled={busy || friend.length < 3}>Añadir</button>
        </form>
      ) : <p className="muted friends-hint">Elige tu nombre para añadir amigos</p>}
      {error && <p className="friends-error" role="alert">{error}</p>}
      <ul className="friends-list">
        {state.friends.map((f, i) => (
          <li key={f.username} style={{ '--i': i }}>
            <Avatar avatar={f.avatar} size={72} />
            <span>@{f.username}</span>
            <button className="prio-x" onClick={run(() => removeFriend(f.username))} aria-label={`Quitar a @${f.username}`}>×</button>
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
