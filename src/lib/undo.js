/**
 * «Deshacer» tras borrar: en vez de preguntar «¿seguro?», se borra y abajo sale un aviso con una línea que se va gastando.
 * Si se pulsa «Deshacer» antes de que se acabe, `restore()` lo devuelve. Lo pinta <UndoToast /> (montado una vez en App).
 */
export const undoable = (message, restore, ms = 6000) => window.dispatchEvent(new CustomEvent('undo-toast', { detail: { message, restore, ms } }))
/** Mete `item` en la posición `index` de una copia de la lista (sin repetirlo si ya está). */
export const insertAt = (list, item, index) => {
  const next = (list ?? []).filter((x) => x.id !== item.id)
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
  return next
}
