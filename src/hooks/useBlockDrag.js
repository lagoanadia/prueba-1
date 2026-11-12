import { useState } from 'react'

/**
 * Arrastrar bloques de una página para reordenarlos (modo edición): se agarra el bloque entero y se suelta
 * sobre otro; una barra azul marca si caerá antes o después. `setBlocks(fn)` recibe la lista actual y devuelve la nueva.
 * Devuelve `props(b)` (para el <section>) y `cls(b)` (clases de estado).
 */
export default function useBlockDrag(setBlocks, enabled) {
  const [drag, setDrag] = useState(null) // { id, over, after }
  const drop = () => {
    const d = drag
    setDrag(null)
    if (!d?.over || d.over === d.id) return
    setBlocks((list) => {
      const item = list.find((x) => x.id === d.id)
      if (!item) return list
      const rest = list.filter((x) => x.id !== d.id)
      const at = rest.findIndex((x) => x.id === d.over) + (d.after ? 1 : 0)
      rest.splice(at, 0, item)
      return rest
    })
  }
  const props = (b) => (enabled ? {
    draggable: true,
    onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); setDrag({ id: b.id, over: null, after: false }) },
    onDragEnd: () => setDrag(null),
    onDragOver: (e) => {
      if (!drag) return
      e.preventDefault()
      const r = e.currentTarget.getBoundingClientRect()
      const after = b.span >= 3 ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2 // ancho completo: arriba/abajo; si no, izquierda/derecha
      if (drag.over !== b.id || drag.after !== after) setDrag({ ...drag, over: b.id, after })
    },
    onDrop: (e) => { e.preventDefault(); drop() },
  } : {})
  const cls = (b) => {
    if (!drag) return ''
    if (drag.id === b.id) return 'is-dragging'
    if (drag.over === b.id) return `${drag.after ? 'drop-after' : 'drop-before'} ${b.span >= 3 ? 'drop-v' : 'drop-h'}`
    return ''
  }
  return { props, cls }
}
