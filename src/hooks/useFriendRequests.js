import { useEffect, useState } from 'react'
import { FRIENDS_EVENT, getFriends } from '../services/friendsService.js'

const EVERY = 60_000 // cada minuto mira si hay peticiones nuevas

/** Número de peticiones de amistad pendientes (para el globo rojo del perfil). */
export default function useFriendRequests() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let alive = true
    const load = () => { if (document.visibilityState !== 'hidden') getFriends().then((s) => alive && setCount(s.incoming?.length ?? 0)).catch(() => {}) }
    const onChange = (e) => setCount(e.detail?.incoming?.length ?? 0)
    load()
    const id = setInterval(load, EVERY)
    window.addEventListener(FRIENDS_EVENT, onChange)
    document.addEventListener('visibilitychange', load)
    return () => { alive = false; clearInterval(id); window.removeEventListener(FRIENDS_EVENT, onChange); document.removeEventListener('visibilitychange', load) }
  }, [])
  return count
}
