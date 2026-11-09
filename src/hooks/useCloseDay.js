import { useEffect, useRef, useState } from 'react'
import { todayISO } from '../lib/dates.js'
import { social, socialChanged } from '../services/socialService.js'

const KEY = 'inblocks:closed'
const SECRET = { halo: 'una aureola', starclip: 'una estrella', sprout: 'un brote', partyhat: 'un gorro de fiesta' }

/**
 * Cuando tachas TODAS las tareas de hoy, se apila un bloque en tu edificio (una vez al día),
 * del color del área en la que más has hecho. Devuelve un aviso para enseñar.
 */
export default function useCloseDay(items) {
  const [notice, setNotice] = useState(null)
  const busy = useRef(false)
  const allDone = items.length > 0 && items.every((i) => i.done)
  useEffect(() => {
    if (!allDone || busy.current) return
    const today = todayISO()
    try { if (localStorage.getItem(KEY) === today) return } catch { return }
    busy.current = true
    // Esperamos un poco: la última casilla tarda en guardarse y el servidor lo comprueba con tus datos
    const timer = setTimeout(() => social('closeDay').then((r) => {
      try { localStorage.setItem(KEY, today) } catch { /* nada */ }
      if (!r.already) setNotice(r.unlocked ? `¡Día cerrado! Has encontrado ${SECRET[r.unlocked]} para tu avatar` : `¡Día cerrado! +1 bloque en tu edificio (${r.blocks})`)
      socialChanged()
    }).catch(() => {}).finally(() => { busy.current = false }), 2500)
    return () => { clearTimeout(timer); busy.current = false }
  }, [allDone]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(null), 6000); return () => clearTimeout(id) }, [notice])
  return notice
}
