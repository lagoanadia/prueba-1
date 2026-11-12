import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 6 // px antes de que cuente como arrastre (si no, es un toque)
const COOLDOWN = 260 // ms sin recolocar tras un cambio: evita que dos bloques "boten" entre sí
const HOLD = 320 // en pantallas táctiles se arrastra manteniendo pulsado (si no, sería un scroll)
const INTERACTIVE = 'button, a, input, textarea, select, label, [contenteditable="true"], [role="slider"]'

/**
 * Arrastre con puntero (ratón o dedo). Con ratón empieza al moverse un poco; con el dedo, al mantener pulsado.
 * Llama a onStart(ev) una vez, onMove(ev) mientras arrastras y onEnd(ev) al soltar.
 */
export function pointerDrag(e, { onStart, onMove, onEnd }) {
  const sx = e.clientX
  const sy = e.clientY
  const touch = e.pointerType === 'touch'
  let active = false
  const start = (ev) => { active = true; navigator.vibrate?.(8); onStart(ev) }
  const timer = touch ? setTimeout(() => start(e), HOLD) : 0
  const blockScroll = (ev) => { if (active) ev.preventDefault() }
  const move = (ev) => {
    if (!active) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < THRESHOLD) return
      if (touch) { cleanup(); return } // se ha movido antes de tiempo: es un scroll
      start(ev)
    }
    onMove?.(ev)
  }
  const up = (ev) => { if (active) onEnd?.(ev); cleanup() }
  const cancel = (ev) => { if (active) onEnd?.(ev, true); cleanup() }
  const cleanup = () => {
    clearTimeout(timer)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('touchmove', blockScroll)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('touchmove', blockScroll, { passive: false })
}

/** Mueve el elemento con id `id` al sitio del elemento `targetId`. */
export const reorder = (list, id, targetId) => {
  const from = list.findIndex((x) => x.id === id)
  const to = list.findIndex((x) => x.id === targetId)
  if (from < 0 || to < 0 || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Al pulsar en un espacio en blanco (fuera de los bloques y botones) se sale del modo edición. */
export function useExitOnBlank(editing, stop) {
  const ref = useRef(stop)
  ref.current = stop
  useEffect(() => {
    if (!editing) return undefined
    const onDown = (e) => {
      if (e.button > 0 || !(e.target instanceof Element)) return
      if (e.target.closest(`.plan-block, .widget, .add-square, .card, [role="dialog"], [role="menu"], .gallery, .ghost, ${INTERACTIVE}`)) return
      ref.current()
    }
    const onKey = (e) => { if (e.key === 'Escape') ref.current() }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [editing])
}

/**
 * Modo edición de una página de bloques (Estudios, Trabajo, proyecto):
 * - arrastrar un bloque lo cambia de sitio (se recoloca al pasar por encima de otro)
 * - arrastrar una pieza de la fila «Añadir» la coloca donde la sueltes
 * setBlocks(fn) cambia la lista; onAdd(type, beforeId|null) añade un bloque.
 */
export default function useEditBoard({ editing, setEditing, setBlocks, onAdd }) {
  const [dragId, setDragId] = useState(null)
  const [ghost, setGhost] = useState(null) // { label, x, y } mientras arrastras una pieza nueva
  useExitOnBlank(editing && !dragId && !ghost, () => setEditing(false))

  const blockProps = (id) => ({
    'data-bid': id,
    onPointerDown: (e) => {
      if (!editing || e.button > 0 || e.target.closest(INTERACTIVE)) return
      let last = null
      let until = 0
      pointerDrag(e, {
        onStart: () => setDragId(id),
        onMove: (ev) => {
          const now = performance.now()
          const tid = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-bid]')?.dataset.bid
          if (!tid || tid === id) { last = null; return }
          if (tid === last || now < until) return
          last = tid
          until = now + COOLDOWN
          setBlocks((l) => reorder(l, id, tid))
        },
        onEnd: (ev, cancelled) => {
          // Al soltar, se queda en el sitio del bloque que hay debajo (aunque no haya dado tiempo a recolocarlo)
          const tid = !cancelled && document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-bid]')?.dataset.bid
          if (tid && tid !== id && tid !== last) setBlocks((l) => reorder(l, id, tid))
          setDragId(null)
        },
      })
    },
  })

  const tileDown = (e, option) => {
    if (e.button > 0) return
    pointerDrag(e, {
      onStart: (ev) => setGhost({ label: option.label, x: ev.clientX, y: ev.clientY }),
      onMove: (ev) => setGhost((g) => g && { ...g, x: ev.clientX, y: ev.clientY }),
      onEnd: (ev, cancelled) => {
        setGhost(null)
        if (cancelled) return
        const under = document.elementFromPoint(ev.clientX, ev.clientY)
        const bid = under?.closest('[data-bid]')?.dataset.bid
        if (bid) onAdd(option.type, bid)
        else if (under?.closest('.plan-grid')) onAdd(option.type, null)
      },
    })
  }

  return { dragId, blockProps, tileDown, ghost }
}
