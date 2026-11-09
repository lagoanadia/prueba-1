import { useCallback, useEffect, useRef, useState } from 'react'
import { FRIENDS_EVENT, getFriends } from '../services/friendsService.js'

const EVERY = 60_000 // cada minuto mira si hay peticiones nuevas
const SEEN_KEY = 'inblocks:seen-requests'
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) ?? [] } catch { return [] } }
const writeSeen = (list) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(list)) } catch { /* sin almacenamiento: no pasa nada */ } }

/**
 * Peticiones de amistad pendientes: el número (globo rojo) y un aviso cuando llega una nueva
 * (dentro de la app y, si diste permiso y la app está en segundo plano, notificación del sistema).
 */
export default function useFriendRequests() {
  const [count, setCount] = useState(0)
  const [toast, setToast] = useState(null) // { username, avatar }
  const seen = useRef(readSeen())

  useEffect(() => {
    let alive = true
    const handle = (s) => {
      const incoming = s.incoming ?? []
      setCount(incoming.length)
      const fresh = incoming.filter((u) => !seen.current.includes(u.username))
      if (!fresh.length) return
      seen.current = [...seen.current, ...fresh.map((u) => u.username)].slice(-100)
      writeSeen(seen.current)
      setToast(fresh[0])
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('inblocks', { body: `@${fresh[0].username} quiere ser tu amigo`, icon: '/icon-192.png', tag: 'friend-' + fresh[0].username }) } catch { /* algunos móviles solo permiten avisos desde un service worker */ }
      }
    }
    const load = () => getFriends().then((s) => alive && handle(s)).catch(() => {})
    const onChange = (e) => setCount(e.detail?.incoming?.length ?? 0)
    load()
    const id = setInterval(load, EVERY)
    window.addEventListener(FRIENDS_EVENT, onChange)
    document.addEventListener('visibilitychange', load)
    return () => { alive = false; clearInterval(id); window.removeEventListener(FRIENDS_EVENT, onChange); document.removeEventListener('visibilitychange', load) }
  }, [])

  const dismiss = useCallback(() => setToast(null), [])
  return { count, toast, dismiss }
}
