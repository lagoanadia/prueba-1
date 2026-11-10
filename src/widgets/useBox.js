import { useLayoutEffect, useRef, useState } from 'react'

/** Mide el hueco disponible (ancho y alto) de un elemento y se actualiza si cambia. */
export function useBox() {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}
