import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/Icon.jsx'

/**
 * Botón + en la esquina del widget que abre una ventana con el formulario de añadir.
 * Sirve para que los tamaños pequeños también dejen añadir (no solo el grande).
 * `children(close)` = el formulario; llama a close() al guardar.
 */
export default function AddPopup({ label, children }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  useEffect(() => { if (!open) return; const k = (e) => e.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [open])
  return (
    <>
      <button className="w-add-btn" onClick={(e) => { e.stopPropagation(); setOpen(true) }} onPointerDown={(e) => e.stopPropagation()} aria-label={label} title={label}><Icon name="plus" size={16} /></button>
      {open && createPortal(
        <div className="popup" role="dialog" aria-modal="true" aria-label={label}>
          <div className="popup-backdrop" onClick={close} />
          <div className="popup-panel add-pop">
            <b className="name-dialog-title">{label}</b>
            {children(close)}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
