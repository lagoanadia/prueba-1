import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/Icon.jsx'
import useBoard from '../hooks/useBoard.js'
import { WIDGETS, SIZES, widgetsFor } from '../widgets/registry.js'

const DRAG_THRESHOLD = 6 // px que hay que mover antes de que cuente como arrastre (si no, es un toque)

/** Tamaño según cuántas columnas/filas ocupa: 1x1 = S, 2x1 = M, 2x2 = L. */
const sizeFor = (cols, rows) => (rows === 2 ? 'L' : cols === 2 ? 'M' : 'S')

/** Zoom CSS aplicado a la vista (en portátil escalamos todo). Lo necesitamos para colocar el "fantasma". */
const zoomOf = (el) => parseFloat(getComputedStyle(el.closest('.d-app') ?? document.body).zoom) || 1

/**
 * Plantilla de un área: un grid invisible que se rellena con widgets.
 * Modo personalizar (botón arriba a la derecha), como en el iPhone:
 *   - Arrastrar un widget        -> moverlo
 *   - Arrastrar la esquina ◢     -> cambiar tamaño (S / M / L)
 *   - Arrastrar desde la galería -> añadirlo donde lo sueltes (o pulsar «Añadir»)
 *   - ×                          -> quitarlo
 */
export default function AreaScreen({ area, showTitle = true }) {
  const { board, error, updateData, updateLayout } = useBoard(area.id)
  const [editing, setEditing] = useState(false)
  const [gallery, setGallery] = useState(false)
  const [drag, setDrag] = useState(null) // { id, x, y, offX, offY, w, h, zoom }
  const gridRef = useRef(null)
  const available = widgetsFor(area.id)

  const remove = (id) => updateLayout((l) => l.filter((w) => w.id !== id))
  const resize = (id, size) => updateLayout((l) => l.map((w) => (w.id === id ? { ...w, size } : w)))
  const add = (type, size) => {
    updateLayout((l) => [...l, { id: crypto.randomUUID(), type, size }])
    setGallery(false)
  }

  // ---------- Mover (y soltar widgets nuevos) ----------
  // Mientras arrastras, el widget se recoloca en vivo encima del que tengas debajo.
  const moveOver = (id, x, y) => {
    const target = document.elementFromPoint(x, y)?.closest('[data-wid]')
    if (!target || target.dataset.wid === id) return
    const r = target.getBoundingClientRect()
    const after = x > r.left + r.width / 2
    updateLayout((l) => {
      const dragged = l.find((w) => w.id === id)
      const rest = l.filter((w) => w.id !== id)
      const i = rest.findIndex((w) => w.id === target.dataset.wid)
      if (!dragged || i === -1) return l
      rest.splice(after ? i + 1 : i, 0, dragged)
      return rest.map((w) => w.id).join() === l.map((w) => w.id).join() ? l : rest
    })
  }

  useEffect(() => {
    if (!drag) return
    const onMove = (e) => {
      setDrag((d) => d && { ...d, x: e.clientX, y: e.clientY })
      moveOver(drag.id, e.clientX, e.clientY)
    }
    const onUp = () => setDrag(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Empieza a arrastrar `id` cuando el puntero se haya movido un poco desde `start`. */
  const startDragAfterThreshold = (e, id, getRect) => {
    const sx = e.clientX
    const sy = e.clientY
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return
      cleanup()
      const r = getRect()
      const zoom = zoomOf(e.target)
      setDrag({ id, x: ev.clientX, y: ev.clientY, offX: sx - r.left, offY: sy - r.top, w: r.width, h: r.height, zoom })
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

  // ---------- Cambiar tamaño arrastrando la esquina ----------
  const onResizePointerDown = (e, w) => {
    e.stopPropagation()
    e.preventDefault()
    const widgetEl = e.currentTarget.closest('[data-wid]')
    const start = widgetEl.getBoundingClientRect()
    const grid = gridRef.current
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length
    const gap = parseFloat(getComputedStyle(grid).columnGap) * zoomOf(grid)
    const cellW = (grid.getBoundingClientRect().width - gap * (cols - 1)) / cols
    const cellH = parseFloat(getComputedStyle(grid).gridAutoRows) * zoomOf(grid)
    let moved = false
    const onMove = (ev) => {
      moved = true
      const width = start.width + ev.clientX - e.clientX
      const height = start.height + ev.clientY - e.clientY
      const size = sizeFor(width > cellW * 1.5 ? 2 : 1, height > cellH * 1.5 + gap / 2 ? 2 : 1)
      resize(w.id, size)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      if (!moved) resize(w.id, SIZES[(SIZES.indexOf(w.size) + 1) % SIZES.length]) // un toque = siguiente tamaño
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  const dragged = drag && board?.layout.find((w) => w.id === drag.id)

  return (
    <div className="area">
      <header className={`area-head ${showTitle ? '' : 'area-head-floating'}`}>
        {showTitle && <h1><span className="ic" style={{ background: area.color }}><Icon name={area.id} /></span>{area.label}</h1>}
        {available.length > 0 && (
          <button className={`icon-btn customize ${editing ? 'customize-on' : ''}`} onClick={() => setEditing(!editing)}
            aria-label={editing ? 'Terminar de personalizar' : 'Personalizar'} title={editing ? 'Listo' : 'Personalizar'}>
            {editing ? <Icon name="check" /> : <Icon name="sliders" />}
          </button>
        )}
      </header>

      {error && <p className="error">{error}</p>}
      {!board && !error && <div className="spinner" aria-label="Cargando" />}
      {board && available.length === 0 && <p className="muted">Pronto habrá widgets para {area.label}.</p>}

      {board && (
        <div className={`grid ${editing ? 'grid-editing' : ''} ${drag ? 'grid-dragging' : ''}`} ref={gridRef}>
          {board.layout.map((w, i) => (
            <WidgetCard key={w.id} w={w} i={i} data={board.data} update={updateData}
              editing={editing} isDragged={drag?.id === w.id}
              onPointerDown={(e) => onWidgetPointerDown(e, w.id)}
              onRemove={() => remove(w.id)} onResizeStart={(e) => onResizePointerDown(e, w)} />
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
        <div className="ghost" style={{
          zoom: drag.zoom,
          left: (drag.x - drag.offX) / drag.zoom,
          top: (drag.y - drag.offY) / drag.zoom,
          width: drag.w / drag.zoom,
          height: drag.h / drag.zoom,
        }}>
          <WidgetView w={dragged} data={board.data} />
        </div>,
        document.body
      )}
    </div>
  )
}

/** Título + contenido del widget (sin los controles de edición). */
function WidgetView({ w, data, update = () => {} }) {
  const def = WIDGETS[w.type]
  if (!def) return null
  const Widget = def.component
  return (
    <article className={`widget w-${w.size}`}>
      {w.size !== 'S' && <h3 className="w-title"><span className="dot" style={{ background: def.color }} />{def.name}</h3>}
      <div className="w-body"><Widget size={w.size} data={data} update={update} /></div>
    </article>
  )
}

function WidgetCard({ w, i, data, update, editing, isDragged, onPointerDown, onRemove, onResizeStart }) {
  const def = WIDGETS[w.type]
  if (!def) return null
  const Widget = def.component
  return (
    <article data-wid={w.id} className={`widget w-${w.size} ${isDragged ? 'w-placeholder' : ''}`} style={{ '--i': i }} onPointerDown={onPointerDown}>
      {w.size !== 'S' && <h3 className="w-title"><span className="dot" style={{ background: def.color }} />{def.name}</h3>}
      <div className="w-body"><Widget size={w.size} data={data} update={update} /></div>
      {editing && (
        <>
          <button className="w-remove" onClick={onRemove} aria-label={`Quitar ${def.name}`}>×</button>
          <button className="w-resize" onPointerDown={onResizeStart} aria-label={`Cambiar tamaño de ${def.name} (ahora ${w.size})`} title="Arrastra para cambiar el tamaño">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M13 3v10H3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      )}
    </article>
  )
}

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
            const size = sizes[w.type] ?? 'M'
            return (
              <div key={w.type} className="gallery-item">
                <div className={`preview p-${size}`} onPointerDown={(e) => onDragStart(e, w.type, size)}>
                  <WidgetView w={{ type: w.type, size }} data={data} />
                </div>
                <div className="gallery-ctrl">
                  <b>{w.name}</b>
                  <div className="seg">{SIZES.map((s) => <button key={s} className={size === s ? 'on' : ''} onClick={() => setSizes({ ...sizes, [w.type]: s })}>{s}</button>)}</div>
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
