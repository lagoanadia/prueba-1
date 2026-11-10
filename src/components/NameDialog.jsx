import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

/**
 * Ventana pequeña para pedir (o cambiar) un nombre: se abre centrada con el fondo atenuado.
 * Enter o ✓ acepta, Esc o × cancela.
 */
export default function NameDialog({ title, initial = '', placeholder = '', maxLength = 50, onSubmit, onClose, onDelete, deleteLabel = 'Eliminar', deleteWarning = 'Se borrará con todo su contenido. No se puede deshacer.' }) {
  const [value, setValue] = useState(initial)
  const input = useRef(null)
  const [sure, setSure] = useState(false) // eliminar pide una segunda pulsación
  useEffect(() => { input.current?.focus(); input.current?.select() }, [])
  const submit = (e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()) }

  // Confirmación de borrado: pantalla propia dentro de la ventana, bien visible
  if (sure) {
    return createPortal(
      <div className="popup" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación" onKeyDown={(e) => e.key === 'Escape' && setSure(false)}>
        <div className="popup-backdrop" onClick={() => setSure(false)} />
        <div className="card name-dialog name-confirm">
          <span className="name-confirm-ic"><Icon name="trash" size={26} color="#B3261E" /></span>
          <b className="name-dialog-title">¿Eliminar «{initial}»?</b>
          <p className="name-confirm-text">{deleteWarning}</p>
          <div className="name-confirm-actions">
            <button type="button" className="name-btn" autoFocus onClick={() => setSure(false)}>Cancelar</button>
            <button type="button" className="name-btn is-danger" onClick={onDelete}><Icon name="trash" size={16} color="#fff" />Sí, eliminar</button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="popup-backdrop" onClick={onClose} />
      <form className="card name-dialog" onSubmit={submit}>
        <b className="name-dialog-title">{title}</b>
        <input ref={input} className="pill-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={maxLength} aria-label={title} />
        <div className="name-dialog-actions">
          {onDelete && (
            <button type="button" className="name-del" onClick={() => setSure(true)}>
              <Icon name="trash" size={18} color="#B3261E" />{deleteLabel}
            </button>
          )}
          <button type="button" className="icon-btn name-x" onClick={onClose} aria-label="Cancelar" title="Cancelar"><Icon name="close" size={22} /></button>
          <button className="icon-btn on" disabled={!value.trim()} aria-label="Aceptar" title="Aceptar"><Icon name="check" size={22} /></button>
        </div>
      </form>
    </div>,
    document.body
  )
}
