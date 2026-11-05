import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/Icon.jsx'
import useBoard from '../hooks/useBoard.js'
import { WIDGETS, SIZES, widgetsFor } from '../widgets/registry.js'

/**
 * Plantilla de un área: un grid invisible que se rellena con widgets.
 * El botón de arriba a la derecha activa el modo "personalizar":
 *   quitar (×), cambiar tamaño (S/M/L), mover (‹ ›) y añadir widgets desde la galería.
 */
export default function AreaScreen({ area, showTitle = true }) {
  const { board, error, updateData, updateLayout } = useBoard(area.id)
  const [editing, setEditing] = useState(false)
  const [gallery, setGallery] = useState(false)
  const available = widgetsFor(area.id)

  const remove = (id) => updateLayout((l) => l.filter((w) => w.id !== id))
  const resize = (id, size) => updateLayout((l) => l.map((w) => (w.id === id ? { ...w, size } : w)))
  const move = (id, dir) => updateLayout((l) => {
    const i = l.findIndex((w) => w.id === id)
    const j = i + dir
    if (j < 0 || j >= l.length) return l
    const next = [...l]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })
  const add = (type, size) => {
    updateLayout((l) => [...l, { id: crypto.randomUUID(), type, size }])
    setGallery(false)
  }

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
        <div className={`grid ${editing ? 'grid-editing' : ''}`}>
          {board.layout.map((w, i) => {
            const def = WIDGETS[w.type]
            if (!def) return null
            const Widget = def.component
            return (
              <article key={w.id} className={`widget w-${w.size}`} style={{ '--i': i }}>
                {w.size !== 'S' && <h3 className="w-title"><span className="dot" style={{ background: def.color }} />{def.name}</h3>}
                <div className="w-body"><Widget size={w.size} data={board.data} update={updateData} /></div>
                {editing && (
                  <div className="w-edit">
                    <button className="w-remove" onClick={() => remove(w.id)} aria-label={`Quitar ${def.name}`}>×</button>
                    <div className="w-edit-bar">
                      <button className="mini" onClick={() => move(w.id, -1)} aria-label="Mover antes">‹</button>
                      <div className="seg">
                        {SIZES.map((s) => <button key={s} className={w.size === s ? 'on' : ''} onClick={() => resize(w.id, s)}>{s}</button>)}
                      </div>
                      <button className="mini" onClick={() => move(w.id, 1)} aria-label="Mover después">›</button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
          {editing && (
            <button className="widget w-S w-add" onClick={() => setGallery(true)} aria-label="Añadir widget">+</button>
          )}
        </div>
      )}

      {/* Portal: la galería se pinta directamente en <body> para cubrir toda la pantalla
          (si no, queda "atrapada" dentro de contenedores con animaciones/transformaciones). */}
      {gallery && createPortal(<Gallery widgets={available} data={board.data} onAdd={add} onClose={() => setGallery(false)} />, document.body)}
    </div>
  )
}

/** Galería: cada widget con vista previa real en el tamaño elegido. */
function Gallery({ widgets, data, onAdd, onClose }) {
  const [sizes, setSizes] = useState({})
  return (
    <div className="gallery" role="dialog" aria-modal="true" aria-label="Añadir widget">
      <div className="gallery-backdrop" onClick={onClose} />
      <div className="gallery-panel">
        <header className="area-head"><h2>Widgets</h2><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button></header>
        <div className="gallery-list">
          {widgets.map((w) => {
            const size = sizes[w.type] ?? 'M'
            const Widget = w.component
            return (
              <div key={w.type} className="gallery-item">
                <div className={`preview p-${size}`}>
                  <article className={`widget w-${size}`}>
                    {size !== 'S' && <h3 className="w-title"><span className="dot" style={{ background: w.color }} />{w.name}</h3>}
                    <div className="w-body" aria-hidden="true"><Widget size={size} data={data} update={() => {}} /></div>
                  </article>
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
