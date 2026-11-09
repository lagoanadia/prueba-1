import { useCallback, useEffect, useState } from 'react'
import { SOCIAL_EVENT, getSocial, social, socialChanged } from '../services/socialService.js'

/** Estado de Amigos (feed, retos, edificio…) + acciones. Se refresca cada minuto y tras cada cambio. */
export default function useSocial() {
  const [state, setState] = useState(null)
  const load = useCallback(() => getSocial().then(setState).catch(() => setState((s) => s ?? { me: { tower: [], unlocks: [] }, friends: [], feed: [], challenges: [], gifts: [] })), [])
  useEffect(() => {
    load()
    const id = setInterval(() => document.visibilityState !== 'hidden' && load(), 60_000)
    window.addEventListener(SOCIAL_EVENT, load)
    return () => { clearInterval(id); window.removeEventListener(SOCIAL_EVENT, load) }
  }, [load])
  const run = useCallback(async (action, body) => { const r = await social(action, body); socialChanged(); return r }, [])
  return { state, run, reload: load }
}
