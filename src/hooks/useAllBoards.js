import { useCallback, useEffect, useState } from 'react'
import { getBoard, saveBoard } from '../services/boardService.js'

/**
 * Carga los tableros de varias áreas a la vez y permite cambiar sus datos (se guardan solos).
 * Lo usan las pantallas que juntan información de todas las áreas: Inicio y Calendario.
 */
export default function useAllBoards(enabled, areas) {
  const [boards, setBoards] = useState({})
  const key = areas.join(',')

  const load = useCallback(() => {
    if (!enabled) return
    Promise.all(key.split(',').map((a) => getBoard(a).then((b) => [a, b]).catch(() => [a, null])))
      .then((pairs) => setBoards(Object.fromEntries(pairs.filter(([, b]) => b))))
  }, [enabled, key])
  useEffect(load, [load])

  const change = (area, fn) => setBoards((all) => {
    const b = all[area] ?? { layout: null, data: {} }
    const data = fn(b.data ?? {})
    saveBoard(area, { layout: b.layout ?? [], data }).catch(() => {})
    return { ...all, [area]: { ...b, data } }
  })

  return { boards, change, reload: load, loaded: Object.keys(boards).length > 0 }
}
