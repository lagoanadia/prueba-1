import { useRef, useState } from 'react'

const THRESHOLD = 6 // px que hay que mover antes de que cuente como arrastre (si no, es un toque)
const COOLDOWN = 240 // ms sin recolocar tras un cambio: evita que los bloques «boten» entre sí
const EDGE = 70 // px del borde de la pantalla a partir de los cuales la página se desplaza sola
const zoomOf = (el) => parseFloat(getComputedStyle(el.closest('.d-app') ?? document.body).zoom) || 1 // la vista de escritorio va con zoom

/**
 * Arrastrar bloques de una página para reordenarlos (modo edición), en cualquier dirección y también con el dedo:
 *  - Se agarra el bloque entero; una copia «fantasma» sigue al puntero y el hueco se recoloca en directo.
 *  - El destino es el bloque más cercano al puntero (da igual si está a los lados, arriba o abajo): se cae antes o después según
 *    el lado (izquierda/derecha; en los de ancho completo, mitad de arriba/abajo).
 *  - Los demás bloques se deslizan a su nuevo sitio y, cerca del borde de la pantalla, la página se desplaza sola.
 * `setBlocks(fn)` recibe la lista actual y devuelve la nueva. Devuelve `props(b)` (para el <section>) y `cls(b)` (clases de estado).
 */
export default function useBlockDrag(setBlocks, enabled) {
  const [dragId, setDragId] = useState(null)
  const setRef = useRef(setBlocks)
  setRef.current = setBlocks

  const start = (e, b) => {
    if (!enabled || e.button > 0 || e.target.closest('button, input, select, textarea, a, [contenteditable="true"]')) return
    const el = e.currentTarget
    const parent = el.parentElement
    const zoom = zoomOf(el)
    const r0 = el.getBoundingClientRect()
    const offX = e.clientX - r0.left
    const offY = e.clientY - r0.top
    const st = { x: e.clientX, y: e.clientY, ghost: null, frame: 0, last: '', cool: 0, scroll: 0 }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const siblings = () => [...parent.querySelectorAll(':scope > [data-bid]')]

    const paint = () => {
      st.frame = 0
      if (st.ghost) st.ghost.style.transform = `translate3d(${(st.x - offX) / zoom}px, ${(st.y - offY) / zoom}px, 0) scale(1.02) rotate(1deg)`
    }
    const begin = () => {
      setDragId(b.id)
      const g = el.cloneNode(true)
      g.removeAttribute('data-bid')
      g.classList.add('block-ghost')
      Object.assign(g.style, { position: 'fixed', left: '0', top: '0', margin: '0', width: `${r0.width / zoom}px`, height: `${r0.height / zoom}px`, zoom: String(zoom), zIndex: '80', pointerEvents: 'none' })
      document.body.appendChild(g)
      st.ghost = g
      paint()
      // cerca del borde de la pantalla la página se desplaza sola (para llevar un bloque más arriba o más abajo)
      st.scroll = setInterval(() => {
        const dy = st.y < EDGE ? -(EDGE - st.y) / 5 : st.y > window.innerHeight - EDGE ? (st.y - (window.innerHeight - EDGE)) / 5 : 0
        if (dy) { window.scrollBy(0, dy); maybeMove() }
      }, 16)
    }

    // Bloque más cercano al puntero (los de dentro del mismo tablero) y de qué lado cae el bloque que arrastras
    const maybeMove = () => {
      const now = performance.now()
      if (now < st.cool) return
      const others = siblings().filter((n) => n.dataset.bid !== b.id)
      if (!others.length) return
      let best = null
      let bestD = Infinity
      others.forEach((n) => {
        const r = n.getBoundingClientRect()
        const d = Math.hypot(st.x < r.left ? r.left - st.x : st.x > r.right ? st.x - r.right : 0, st.y < r.top ? r.top - st.y : st.y > r.bottom ? st.y - r.bottom : 0)
        if (d < bestD) { bestD = d; best = n }
      })
      const r = best.getBoundingClientRect()
      const full = r.width > parent.getBoundingClientRect().width * 0.9
      const inside = st.x >= r.left && st.x <= r.right && st.y >= r.top && st.y <= r.bottom
      const after = full ? st.y > r.top + r.height / 2 : !inside && (st.y > r.bottom || st.y < r.top) ? st.y > r.bottom : st.x > r.left + r.width / 2
      const all = siblings()
      const iD = all.findIndex((n) => n.dataset.bid === b.id)
      const iT = all.indexOf(best)
      if (after ? iD === iT + 1 : iD === iT - 1) return // ya está justo ahí
      const key = `${best.dataset.bid}:${after}`
      if (key === st.last) return
      st.last = key
      st.cool = now + COOLDOWN
      // FLIP: se anota dónde está cada bloque, se recoloca y se anima cada uno desde su sitio anterior
      const before = new Map(all.map((n) => [n.dataset.bid, n.getBoundingClientRect()]))
      setRef.current((list) => {
        const item = list.find((x) => x.id === b.id)
        if (!item) return list
        const rest = list.filter((x) => x.id !== b.id)
        const at = rest.findIndex((x) => x.id === best.dataset.bid) + (after ? 1 : 0)
        rest.splice(at, 0, item)
        return rest
      })
      if (reduce) return
      requestAnimationFrame(() => requestAnimationFrame(() => {
        siblings().forEach((n) => {
          const p = before.get(n.dataset.bid)
          if (!p || n.dataset.bid === b.id) return
          const q = n.getBoundingClientRect()
          const dx = (p.left - q.left) / zoom
          const dy = (p.top - q.top) / zoom
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
          n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2, 1.2, .35, 1)' })
        })
      }))
    }

    const move = (ev) => {
      st.x = ev.clientX
      st.y = ev.clientY
      if (!st.ghost) {
        if (Math.hypot(st.x - e.clientX, st.y - e.clientY) < THRESHOLD) return
        begin()
      }
      if (!st.frame) st.frame = requestAnimationFrame(paint)
      maybeMove()
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      cancelAnimationFrame(st.frame)
      clearInterval(st.scroll)
      st.ghost?.remove()
      if (st.ghost) setDragId(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const props = (b) => (enabled ? { 'data-bid': b.id, onPointerDown: (e) => start(e, b) } : {})
  const cls = (b) => (dragId === b.id ? 'is-dragging' : '')
  return { props, cls }
}
