import useSocial from '../hooks/useSocial.js'
import { MoodFace } from '../screens/FriendsPage.jsx'

/** Lo único social en Inicio: las caras de tus amigos con el color de su humor. Tocar abre Amigos. */
export default function FriendsStrip({ onOpen }) {
  const { state } = useSocial()
  if (!state?.friends.length) return null
  const bday = state.friends.find((f) => f.birthday)
  return (
    <div className="card friends-strip">
      <div className="w-row"><b>Tus amigos hoy</b><button className="text-link" onClick={onOpen}>Ver todo</button></div>
      <div className="fp-strip">{state.friends.slice(0, 8).map((f) => <MoodFace key={f.username} person={f} size={46} onClick={onOpen} />)}</div>
      {bday && <span className="w-hint">@{bday.username} cumple años {bday.birthday === 'today' ? 'hoy' : 'mañana'}</span>}
    </div>
  )
}
