import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'

/** Ventana centrada con fondo atenuado (Esc o fuera = cerrar). */
export default function Modal({ title, icon, onClose, children, wide }) {
  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="popup-backdrop" onClick={onClose} />
      <div className={`card fd-modal ${wide ? 'is-wide' : ''}`}>
        <header className="fd-modal-head">
          {icon && <span className="fd-ic"><Icon name={icon} size={18} /></span>}
          <b className="fd-modal-title">{title}</b>
          <button className="icon-btn fd-x" onClick={onClose} aria-label="Cerrar" title="Cerrar"><Icon name="close" size={20} /></button>
        </header>
        {children}
      </div>
    </div>,
    document.body
  )
}
