import { useEffect } from 'react'

/**
 * Modo edición de un tablero: al pulsar fuera de lo que se está editando, se sale.
 * `keep` = selectores de lo que NO cuenta como «fuera» (los bloques, el botón de editar, ventanas…).
 */
export default function useExitEdit(editing, exit, keep = '.plan-block, .add-square, .customize, .popup') {
  useEffect(() => {
    if (!editing) return undefined
    const h = (e) => { if (e.target.closest?.(keep)) return; exit() }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps
}
