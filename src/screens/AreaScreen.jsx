import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/Icon.jsx'
import TopActions from '../components/TopActions.jsx'
import useBoard from '../hooks/useBoard.js'
import { WIDGETS, SIZES, fitSize, sizesOf, widgetsFor } from '../widgets/registry.js'
import Onboarding from '../onboarding/Onboarding.jsx'
import { FLOWS } from '../onboarding/flows.js'
import { PAGES } from '../pages/index.js'

const DRAG_THRESHOLD = 6 // px que hay que mover antes de que cuente como arrastre (si no, es un toque)
const SWAP_COOLDOWN = 280 // ms sin recolocar tras un cambio: evita que dos widgets "boten" entre sí

/** Zoom CSS aplicado a la vista (en portátil escalamos todo). Lo necesitamos para colocar el "fantasma". */
const zoomOf = (el) => parseFloat(getComputedStyle(el.closest('.d-app') ?? document.body).zoom) || 1

/** Mueve un elemento de la posición `from` a la `to` (como arrastrar en una lista). */
const arrayMove = (list, from, to) => {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Plantilla de un área: un grid invisible que se rellena con widgets.
 * Modo personalizar (botón arriba a la derecha):
 *   - Arrastrar un widget        -> moverlo
 *   - Dock de tamaños (abajo)    -> S / M / L con animación de "muelle"
 *   - Arrastrar desde la galería -> añadirlo donde lo sueltes (o pulsar «Añadir»)
 *   - ×                          -> quitarlo
 *
 * Rendimiento: mientras arrastras NO se vuelve a pintar React en cada movimiento.
 * El fantasma se mueve tocando su `transform` directamente (en un requestAnimationFrame).
 */
export default function AreaScreen({ area, showTitle = true }) {
  const { board, error, updateData, updateLayout } = useBoard(area.id)
  const [editing, setEditing] = useState(false)
  const [gallery, setGallery] = useState(false)
  const [drag, setDrag] = useState(null) // solo cambia al empezar/terminar: { id, w, h, zoom, x0, y0 }
  const gridRef = useRef(null)
  const ghostRef = useRef(null)
  const cards = useRef(new Map()) // id -> elemento del widget (para animar)
  const lastRects = useRef(new Map())
  const available = widgetsFor(area.id)

  /*
   * Animación FLIP (First, Last, Invert, Play): cuando cambia el orden o el tamaño,
   * medimos dónde ha quedado cada widget, lo "devolvemos" visualmente a su sitio anterior
   * con un transform y lo animamos hasta el nuevo con un pequeño rebote.
   * Solo se ejecuta cuando cambia el layout (no en cada render) para no forzar medidas sin motivo.
   */
  const layoutKey = board?.layout.map((w) => w.id + w.size).join('|')
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const g = grid.getBoundingClientRect()
    const zoom = zoomOf(grid)
    const next = new Map()
    cards.current.forEach((el, id) => {
      const r = el.getBoundingClientRect()
      const rect = { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height }
      next.set(id, rect)
      const prev = lastRects.current.get(id)
      if (!prev) return
      const dx = (prev.x - rect.x) / zoom
      const dy = (prev.y - rect.y) / zoom
      const sx = prev.w / rect.w
      const sy = prev.h / rect.h
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' }, { transform: 'none', transformOrigin: 'top left' }],
        { duration: 450, easing: 'cubic-bezier(.2, 1.3, .35, 1)' }
      )
    })
    lastRects.current = next
  }, [layoutKey])

  const remove = (id) => updateLayout((l) => l.filter((w) => w.id !== id))
  const resize = (id, size) => {
    navigator.vibrate?.(8) // pequeño "toque" en móviles que lo permiten
    updateLayout((l) => l.map((w) => (w.id === id ? { ...w, size } : w)))
  }
  const add = (type, size) => {
    updateLayout((l) => [...l, { id: crypto.randomUUID(), type, size }])
    setGallery(false)
  }

  // ---------- Arrastrar ----------
  useEffect(() => {
    if (!drag) return
    const st = { x: drag.x0, y: drag.y0, frame: 0, last: null, cooldown: 0 }

    const paintGhost = () => {
      st.frame = 0
      const el = ghostRef.current
      if (el) el.style.transform = `translate3d(${(st.x - drag.offX) / drag.zoom}px, ${(st.y - drag.offY) / drag.zoom}px, 0) scale(1.04) rotate(1.5deg)`
    }

    // Recolocar con "histéresis": solo cuando entras en OTRO widget y ha pasado un momento desde el último cambio
    const maybeReorder = () => {
      const now = performance.now()
      if (now < st.cooldown) return
      const target = document.elementFromPoint(st.x, st.y)?.closest('[data-wid]')
      const tid = target?.dataset.wid
      if (!tid || tid === drag.id) { st.last = null; return }
      if (tid === st.last) return
      st.last = tid
      st.cooldown = now + SWAP_COOLDOWN
      updateLayout((l) => {
        const from = l.findIndex((w) => w.id === drag.id)
        const to = l.findIndex((w) => w.id === tid)
        return from === -1 || to === -1 ? l : arrayMove(l, from, to)
      })
    }

    const onMove = (e) => {
      st.x = e.clientX
      st.y = e.clientY
      if (!st.frame) st.frame = requestAnimationFrame(paintGhost)
      maybeReorder()
    }
    const onUp = () => setDrag(null)
    paintGhost()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onUp, { once: true })
    return () => {
      cancelAnimationFrame(st.frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Empieza a arrastrar `id` cuando el puntero se haya movido un poco (si no, es un toque normal). */
  const startDragAfterThreshold = (e, id, getRect) => {
    const sx = e.clientX
    const sy = e.clientY
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return
      cleanup()
      const r = getRect()
      setDrag({ id, x0: ev.clientX, y0: ev.clientY, offX: sx - r.left, offY: sy - r.top, w: r.width, h: r.height, zoom: zoomOf(e.target) })
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
  }

  const onWidgetPointerDown = (e, id) => {
    if (!editing || e.button > 0 || e.target.closest('button')) return
    const el = e.currentTarget
    startDragAfterThreshold(e, id, () => el.getBoundingClientRect())
  }

  // Desde la galería: se cierra, el widget entra al tablero y sigue pegado al dedo.
  const onGalleryPointerDown = (e, type, size) => {
    if (e.button > 0) return
    const el = e.currentTarget
    const id = crypto.randomUUID()
    startDragAfterThreshold(e, id, () => {
      const r = el.getBoundingClientRect()
      setGallery(false)
      updateLayout((l) => [...l, { id, type, size }])
      return r
    })
  }

  // Las tarjetas están memorizadas (memo): para que no se repinten sin motivo, les pasamos
  // funciones estables que leen siempre la última versión desde este ref.
  const api = useRef({})
  api.current = { onPointerDown: onWidgetPointerDown, remove, resize, updateData }
  const [stableApi] = useState(() => ({
    onPointerDown: (e, id) => api.current.onPointerDown(e, id),
    remove: (id) => api.current.remove(id),
    resize: (id, size) => api.current.resize(id, size),
    updateData: (fn) => api.current.updateData(fn),
    setRef: (id, el) => (el ? cards.current.set(id, el) : cards.current.delete(id)),
  }))

  const dragged = drag && board?.layout.find((w) => w.id === drag.id)

  // Primera vez en esta área: preguntas para rellenar los widgets con tus datos (no con datos de ejemplo)
  if (board?.isNew && !board.data.onboarded && FLOWS[area.id]) {
    return (
      <div className="area">
        <Onboarding area={area} flow={FLOWS[area.id]} onDone={(answers) => updateData((d) => ({ ...d, ...answers }))} />
      </div>
    )
  }

  // Áreas con página propia: misma carga/guardado de datos, pero sin el tablero de widgets
  const Page = PAGES[area.id]
  if (Page) {
    if (!board) return <div className="area">{error ? <p className="error">{error}</p> : <div className="spinner" aria-label="Cargando" />}</div>
    return <Page area={area} data={board.data} update={updateData} />
  }

  return (
    <div className="area">
      <header className="area-head area-head-floating">
        <h1 className="sr-only">{area.label}</h1>
        {available.length > 0 && (
          <TopActions><button className={`icon-btn customize ${editing ? 'customize-on' : ''}`} onClick={() => setEditing(!editing)}
            aria-label={editing ? 'Terminar de personalizar' : 'Personalizar tablero'} title={editing ? 'Listo' : 'Personalizar tablero'}>
            <Icon name={editing ? 'check' : 'board'} color={editing ? '#FFFFFF' : '#202124'} />
          </button></TopActions>
        )}
      </header>

      {error && <p className="error">{error}</p>}
      {!board && !error && <div className="spinner" aria-label="Cargando" />}
      {board && available.length === 0 && <p className="muted">Pronto habrá widgets para {area.label}.</p>}

      {board && (
        <div className={`grid ${editing ? 'grid-editing' : ''} ${drag ? 'grid-dragging' : ''}`} ref={gridRef}>
          {board.layout.map((w, i) => (
            <WidgetCard key={w.id} w={w} i={i} data={board.data} editing={editing} isDragged={drag?.id === w.id} api={stableApi} />
          ))}
          {editing && (
            <button className="widget w-S w-add" onClick={() => setGallery(true)} aria-label="Añadir widget">+</button>
          )}
        </div>
      )}

      {/* Portales: se pintan en <body> para cubrir toda la pantalla
          (si no, quedan "atrapados" dentro de contenedores con zoom o animaciones). */}
      {gallery && createPortal(
        <Gallery widgets={available} data={board.data} onAdd={add} onDragStart={onGalleryPointerDown} onClose={() => setGallery(false)} />,
        document.body
      )}
      {drag && dragged && createPortal(
        <div className="ghost" ref={ghostRef} style={{ zoom: drag.zoom, width: drag.w / drag.zoom, height: drag.h / drag.zoom }}>
          <WidgetView w={dragged} data={board.data} />
        </div>,
        document.body
      )}
    </div>
  )
}

/** Título + contenido del widget (sin los controles de edición). */
function WidgetView({ w: raw, data, update = () => {} }) {
  const def = WIDGETS[raw.type]
  if (!def) return null
  const w = { ...raw, size: fitSize(raw.type, raw.size) }
  const Widget = def.component
  return (
    <article className={`widget w-${w.size}`}>
      {w.size !== 'S' && <h3 className="w-title"><span className="dot" style={{ background: def.color }} />{def.name}</h3>}
      <div className="w-body"><Widget size={w.size} data={data} update={update} /></div>
    </article>
  )
}

/** Dock de tamaños: tres formas (cuadrado, rectángulo, cuadrado grande) y un indicador que se desliza. */
function SizeDock({ size, onPick, name, sizes = SIZES }) {
  return (
    <div className="size-dock" style={{ '--idx': sizes.indexOf(size) }} role="radiogroup" aria-label={`Tamaño de ${name}`}>
      <span className="size-dock-pill" aria-hidden="true" />
      {sizes.map((s) => (
        <button key={s} role="radio" aria-checked={size === s} aria-label={{ S: 'Pequeño', T: 'Vertical', M: 'Ancho', L: 'Grande' }[s]}
          className={size === s ? 'on' : ''} onClick={() => size !== s && onPick(s)}>
          <span className={`shape shape-${s}`} />
        </button>
      ))}
    </div>
  )
}

// memo: solo se repinta si cambian sus datos (no cada vez que se mueve el fantasma o cambia otro widget)
const WidgetCard = memo(function WidgetCard({ w: raw, i, data, editing, isDragged, api }) {
  const def = WIDGETS[raw.type]
  if (!def) return null
  const w = { ...raw, size: fitSize(raw.type, raw.size) } // tamaños antiguos que ya no valen → el más parecido
  const Widget = def.component
  return (
    <article ref={(el) => api.setRef(w.id, el)} data-wid={w.id} onPointerDown={(e) => api.onPointerDown(e, w.id)}
      className={`widget w-${w.size} ${isDragged ? 'w-placeholder' : ''}`} style={{ '--i': i }}>
      {w.size !== 'S' && <h3 className="w-title"><span className="dot" style={{ background: def.color }} />{def.name}</h3>}
      {/* key = tamaño: al cambiar, el contenido entra con un fundido (la vista de cada tamaño es distinta) */}
      <div className="w-body" key={w.size}><Widget size={w.size} data={data} update={api.updateData} /></div>
      {editing && (
        <>
          <button className="w-remove" onClick={() => api.remove(w.id)} aria-label={`Quitar ${def.name}`}>×</button>
          <SizeDock size={w.size} sizes={sizesOf(w.type)} name={def.name} onPick={(s) => api.resize(w.id, s)} />
        </>
      )}
    </article>
  )
})

/** Galería: cada widget con vista previa real. Se puede arrastrar al tablero o pulsar «Añadir». */
function Gallery({ widgets, data, onAdd, onDragStart, onClose }) {
  const [sizes, setSizes] = useState({})
  return (
    <div className="gallery" role="dialog" aria-modal="true" aria-label="Añadir widget">
      <div className="gallery-backdrop" onClick={onClose} />
      <div className="gallery-panel">
        <header className="area-head"><h2>Widgets</h2><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button></header>
        <p className="w-hint gallery-tip">Arrastra un widget a tu tablero</p>
        <div className="gallery-list">
          {widgets.map((w) => {
            const size = fitSize(w.type, sizes[w.type] ?? 'M')
            return (
              <div key={w.type} className="gallery-item">
                <div className={`preview p-${size}`} onPointerDown={(e) => onDragStart(e, w.type, size)}>
                  <WidgetView w={{ type: w.type, size }} data={data} />
                </div>
                <div className="gallery-ctrl">
                  <b>{w.name}</b>
                  <div className="seg">{sizesOf(w.type).map((s) => <button key={s} className={size === s ? 'on' : ''} onClick={() => setSizes({ ...sizes, [w.type]: s })}>{s}</button>)}</div>
                  <button className="pill pill-on" onClick={() => onAdd(w.type, size)}>Añadir</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
