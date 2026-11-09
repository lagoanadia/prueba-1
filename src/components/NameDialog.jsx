import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

/**
 * Ventana pequeña para pedir (o cambiar) un nombre: se abre centrada con el fondo atenuado.
 * Enter o ✓ acepta, Esc o × cancela.
 */
export default function NameDialog({ title, initial = '', placeholder = '', maxLength = 50, onSubmit, onClose }) {
  const [value, setValue] = useState(initial)
  const input = useRef(null)
  useEffect(() => { input.current?.focus(); input.current?.select() }, [])
  const submit = (e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()) }

  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="popup-backdrop" onClick={onClose} />
      <form className="card name-dialog" onSubmit={submit}>
        <b className="name-dialog-title">{title}</b>
        <input ref={input} className="pill-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={maxLength} aria-label={title} />
        <div className="name-dialog-actions">
          <button type="button" className="icon-btn name-x" onClick={onClose} aria-label="Cancelar" title="Cancelar"><Icon name="close" size={22} /></button>
          <button className="icon-btn on" disabled={!value.trim()} aria-label="Aceptar" title="Aceptar"><Icon name="check" size={22} /></button>
        </div>
      </form>
    </div>,
    document.body
  )
}
