import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

/**
 * REGLA DEL PROYECTO: lo que ya pasó no ocupa sitio en pantalla.
 * Se guarda detrás de este icono de reloj y se ve en un pop-up.
 *
 * <History title="Botellas abiertas" items={[{ id, date, text }]} />
 */
export default function History({ title, items, empty = 'Nada todavía' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="w-history" onClick={() => setOpen(true)} aria-label={`${title} (${items.length})`} title={title}>
        <Icon name="history" size={18} strokeWidth={2.2} />
        {items.length > 0 && <span className="w-history-n">{items.length}</span>}
      </button>
      {open && createPortal(
        <div className="popup" role="dialog" aria-modal="true" aria-label={title}>
          <div className="popup-backdrop" onClick={() => setOpen(false)} />
          <div className="popup-panel">
            <header className="area-head">
              <h2><Icon name="history" size={20} /> {title}</h2>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar"><Icon name="close" /></button>
            </header>
            {items.length === 0 && <p className="w-hint">{empty}</p>}
            <ul className="popup-list">
              {items.map((it) => (
                <li key={it.id}>
                  <span className="w-hint">{it.date}</span>
                  <span className="w-text">{it.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
