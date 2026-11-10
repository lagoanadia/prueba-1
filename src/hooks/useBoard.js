import { useEffect, useRef, useState } from 'react'
import { getBoard, saveBoard } from '../services/boardService.js'
import { BOARDS_EVENT } from '../services/entriesService.js'
import { defaultLayout } from '../widgets/registry.js'
import { recordUse } from '../lib/usage.js'

/**
 * Tablero de un área: qué widgets hay (layout) y sus datos (data).
 * Cada cambio se guarda en el backend ~0,6 s después (así no mandamos una petición por cada tecla).
 */
export default function useBoard(area) {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')
  const loaded = useRef(false)

  useEffect(() => {
    loaded.current = false
    setBoard(null)
    getBoard(area)
      .then((b) => setBoard({
        layout: b.layout ?? defaultLayout(area),
        data: b.data ?? {},
        // Área nueva: nunca guardada y sin datos -> se le hacen las preguntas iniciales
        isNew: b.layout == null && Object.keys(b.data ?? {}).length === 0,
      }))
      .catch((e) => setError(e.message))
  }, [area])

  // Si el asistente ha apuntado algo en esta área, se recarga sola (sin refrescar la página)
  useEffect(() => {
    const onChange = (e) => {
      if (!e.detail?.includes(area)) return
      getBoard(area).then((b) => { loaded.current = false; setBoard((cur) => ({ ...(cur ?? {}), layout: b.layout ?? cur?.layout ?? defaultLayout(area), data: b.data ?? {}, isNew: false })) }).catch(() => {})
    }
    window.addEventListener(BOARDS_EVENT, onChange)
    return () => window.removeEventListener(BOARDS_EVENT, onChange)
  }, [area])

  useEffect(() => {
    if (!board) return
    if (!loaded.current) { loaded.current = true; return } // la primera vez es la carga, no un cambio
    const t = setTimeout(() => saveBoard(area, { layout: board.layout, data: board.data }).catch((e) => setError(e.message)), 600)
    return () => clearTimeout(t)
  }, [board, area])

  const updateData = (fn) => { recordUse(); setBoard((b) => ({ ...b, data: fn(b.data) })) }
  const updateLayout = (fn) => { recordUse(); setBoard((b) => ({ ...b, layout: fn(b.layout) })) }

  return { board, error, updateData, updateLayout }
}
