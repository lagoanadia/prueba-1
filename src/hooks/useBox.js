import { useLayoutEffect, useState } from 'react'

/**
 * Mide el tamaño real (ancho y alto) de un elemento y lo actualiza si cambia.
 * Usa ResizeObserver: el navegador nos avisa cuando el elemento cambia de tamaño.
 */
export default function useBox(ref) {
  const [box, setBox] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox((b) => (Math.abs(b.w - width) < 1 && Math.abs(b.h - height) < 1 ? b : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return box
}
