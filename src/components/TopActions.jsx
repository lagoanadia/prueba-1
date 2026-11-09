import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Coloca sus hijos (p. ej. el botón de personalizar) en la barra de arriba del portátil,
 * junto al título de la sección. En móvil no hay barra: se quedan donde están.
 */
export default function TopActions({ children }) {
  const [target, setTarget] = useState(null)
  useEffect(() => { setTarget(document.getElementById('top-actions')) }, [])
  return target ? createPortal(children, target) : children
}
