import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/Icon.jsx'
import TopActions from '../components/TopActions.jsx'
import useBoard from '../hooks/useBoard.js'
import { WIDGETS, SIZES, fitSize, shownSize, sizesOf, widgetsFor } from '../widgets/registry.js'
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
  const { board, error, saveError, retrySave, updateData, updateLayout } = useBoard(area.id)

  // Salud: Sueño y Agua ya no existen; se quitan de los tableros guardados
  useEffect(() => {
    if (area.id !== 'salud' || !board || board.isNew) return
    if (board.layout.some((w) => w.type === 'sleep' || w.type === 'water')) updateLayout((l) => l.filter((w) => w.type !== 'sleep' && w.type !== 'water'))
  }, [area.id, board?.layout]) // eslint-disable-line react-hooks/exhaustive-deps

  // Salud: se abren todos los widgets de Salud en grande, una sola vez (los que falten se añaden); luego puedes cambiarlos o quitarlos
  useEffect(() => {
    if (area.id !== 'salud' || !board || board.isNew || board.data.healthAllOpen) return
    const all = widgetsFor('salud').map((w) => w.type)
    updateLayout((l) => [...l.map((w) => (all.includes(w.type) ? { ...w, size: 'L' } : w)), ...all.filter((t) => !l.some((w) => w.type === t)).map((type) => ({ id: crypto.randomUUID(), type, size: 'L' }))])
    updateData((d) => ({ ...d, healthAllOpen: true, healthWidgetsAdded: true }))
  }, [area.id, board?.isNew, Boolean(board)]) // eslint-disable-line react-hooks/exhaustive-deps
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
  const setConfig = (id, patch) => updateLayout((l) => l.map((w) => (w.id === id ? { ...w, ...patch } : w))) // ajustes de un widget concreto (p. ej. su hábito)
  api.current = { onPointerDown: onWidgetPointerDown, remove, resize, updateData, setConfig }
  const [stableApi] = useState(() => ({
    onPointerDown: (e, id) => api.current.onPointerDown(e, id),
    remove: (id) => api.current.remove(id),
    resize: (id, size) => api.current.resize(id, size),
    updateData: (fn) => api.current.updateData(fn),
    setConfig: (id, patch) => api.current.setConfig(id, patch),
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

  // Si un guardado falla se avisa (antes pasaba en silencio y al recargar se perdían los últimos cambios)
  const saveBanner = saveError ? (
    <div className="save-error" role="alert"><Icon name="close" size={16} color="#B3261E" strokeWidth={3} /><span>No se han podido guardar los últimos cambios ({saveError}).</span><button className="pill pill-sm" onClick={retrySave}>Reintentar</button></div>
  ) : null

  // Áreas con página propia: misma carga/guardado de datos, pero sin el tablero de widgets
  const Page = PAGES[area.id]
  if (Page) {
    if (!board) return <div className="area">{error ? <p className="error">{error}</p> : <div className="spinner" aria-label="Cargando" />}</div>
    return <><Page area={area} data={board.data} update={updateData} />{saveBanner}</>
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
      {saveBanner}
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
  const w = { ...raw, size: shownSize(raw.type, raw.size, data) }
  const Widget = def.component
  return (
    <article className={`widget w-${w.size}`}>
      <h3 className="w-title"><span className="dot" style={{ background: AREA_DOT[def.area] ?? def.color }} />{def.name}</h3>
      <div className="w-body"><Widget size={w.size} data={data} update={update} config={w} /></div>
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

// Color del puntito de los títulos: el del área (Journal amarillo, Salud verde)
const AREA_DOT = { journal: '#F9DC5C', salud: '#3DDC97' }
const BASE_ROWS = { S: 1, M: 1, T: 2, L: 2 } // filas que ocupa cada tamaño
const MAX_ROWS = 8

/**
 * Si lo que hay dentro de un widget no cabe (listas largas, muchas botellas…), no hay scroll: el widget
 * crece hacia abajo ocupando las filas que necesite. Si luego sobra espacio, vuelve a su tamaño.
 */
function useFitRows(ref, size, deps) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => {
      const grid = el.parentElement
      if (!grid) return
      const cs = getComputedStyle(grid)
      const row = parseFloat(cs.getPropertyValue('--row')) || 150
      const gap = parseFloat(cs.rowGap) || 16
      const base = BASE_ROWS[size] ?? 1
      el.style.gridRow = `span ${base}` // se mide con el tamaño normal
      const scrollers = [...el.querySelectorAll('*')].filter((n) => n.clientHeight > 0 && n.scrollHeight > n.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowY))
      const top = scrollers.filter((n) => !scrollers.some((o) => o !== n && o.contains(n)))
      let need = el.clientHeight + top.reduce((sum, n) => sum + (n.scrollHeight - n.clientHeight), 0)
      if (el.scrollHeight > el.clientHeight + 2) need = Math.max(need, el.scrollHeight)
      let n = base
      while (n < MAX_ROWS && n * row + (n - 1) * gap < need) n++
      el.style.gridRow = n > base ? `span ${n}` : ''
    }
    measure()
    const t = setTimeout(measure, 300) // por si el contenido llega un poco después
    const ro = new ResizeObserver(() => measure())
    ro.observe(el.parentElement) // al cambiar el ancho de la rejilla, el texto se recoloca
    // Si el contenido cambia por dentro (p. ej. se despliega un formulario), el widget se vuelve a medir
    let pending = 0
    const mo = new MutationObserver(() => { clearTimeout(pending); pending = setTimeout(measure, 60) })
    mo.observe(el, { childList: true, subtree: true })
    return () => { clearTimeout(t); clearTimeout(pending); ro.disconnect(); mo.disconnect() }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

// memo: solo se repinta si cambian sus datos (no cada vez que se mueve el fantasma o cambia otro widget)
const WidgetCard = memo(function WidgetCard({ w: raw, i, data, editing, isDragged, api }) {
  const def = WIDGETS[raw.type]
  if (!def) return null
  const w = { ...raw, size: shownSize(raw.type, raw.size, data) } // tamaños antiguos → el más parecido; sin contenido → pequeño
  const Widget = def.component
  const cardRef = useRef(null)
  useFitRows(cardRef, w.size, [data, w.size, editing])
  return (
    <article ref={(el) => { cardRef.current = el; api.setRef(w.id, el) }} data-wid={w.id} onPointerDown={(e) => api.onPointerDown(e, w.id)}
      className={`widget w-${w.size} ${isDragged ? 'w-placeholder' : ''}`} style={{ '--i': i }}>
      <h3 className="w-title"><span className="dot" style={{ background: AREA_DOT[def.area] ?? def.color }} />{def.name}</h3>
      {/* key = tamaño: al cambiar, el contenido entra con un fundido (la vista de cada tamaño es distinta) */}
      <div className="w-body" key={w.size}><Widget size={w.size} data={data} update={api.updateData} config={w} setConfig={(patch) => api.setConfig(w.id, patch)} /></div>
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
