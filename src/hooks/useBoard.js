import { useEffect, useRef, useState } from 'react'
import { getBoard, saveBoard } from '../services/boardService.js'
import { BOARDS_EVENT } from '../services/entriesService.js'
import { defaultLayout } from '../widgets/registry.js'

/**
 * Tablero de un área: qué widgets hay (layout) y sus datos (data).
 * Cada cambio se guarda en el backend ~0,6 s después (así no mandamos una petición por cada tecla).
 */
export default function useBoard(area) {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('') // el último guardado falló: se avisa para no perder cambios sin darse cuenta
  const [retry, setRetry] = useState(0)
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
    // Se guarda al dejar de escribir unos segundos (menos escrituras en la base de datos) y siempre al salir de la pestaña
    const run = () => saveBoard(area, { layout: board.layout, data: board.data }).then(() => setSaveError('')).catch((e) => setSaveError(e.message || 'No se ha podido guardar'))
    let done = false
    const once = () => { if (done) return; done = true; clearTimeout(t); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', once); run() }
    const onHide = () => { if (document.visibilityState === 'hidden') once() }
    const t = setTimeout(once, 2500)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', once)
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', once) }
  }, [board, area, retry])

  const updateData = (fn) => setBoard((b) => ({ ...b, data: fn(b.data) }))
  const updateLayout = (fn) => setBoard((b) => ({ ...b, layout: fn(b.layout) }))

  return { board, error, saveError, retrySave: () => setRetry((n) => n + 1), updateData, updateLayout }
}
