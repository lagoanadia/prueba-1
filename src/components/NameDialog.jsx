import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

/**
 * Ventana pequeña para pedir (o cambiar) un nombre: se abre centrada con el fondo atenuado.
 * Enter o ✓ acepta, Esc o × cancela.
 */
export default function NameDialog({ title, initial = '', placeholder = '', maxLength = 50, onSubmit, onClose, onDelete, choices = null, fileSlot = null, deleteLabel = 'Eliminar', deleteWarning = 'Se borrará con todo su contenido. No se puede deshacer.' }) {
  const [value, setValue] = useState(initial)
  const input = useRef(null)
  const [choice, setChoice] = useState(choices?.[0]?.id ?? null) // si hay `choices`, además del nombre se elige de qué tipo es
  const [file, setFile] = useState(null) // PDF (u otro archivo) que se suelta en el cuadro punteado
  const [over, setOver] = useState(false)
  const fileInput = useRef(null)
  const [sure, setSure] = useState(false) // eliminar pide una segunda pulsación
  useEffect(() => { input.current?.focus(); input.current?.select() }, [])
  const submit = (e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim(), choice, fileSlot && (!fileSlot.forChoice || choice === fileSlot.forChoice) ? file : null) }
  const takeFile = (f) => {
    if (!f) return
    if (fileSlot?.accept && !new RegExp(fileSlot.accept, 'i').test(`${f.type} ${f.name}`)) return
    setFile(f)
    if (!value.trim()) setValue(f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').slice(0, maxLength)) // sin nombre: el del archivo
  }

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
        {choices && (
          <div className="name-choices" role="radiogroup" aria-label="Tipo">
            {choices.map((c) => (
              <button type="button" key={c.id} role="radio" aria-checked={choice === c.id} className={choice === c.id ? 'on' : ''} onClick={() => setChoice(c.id)}>
                <span className="name-choice-ic" style={{ background: c.tint }}><Icon name={c.icon} size={20} color={c.ink} /></span>
                <b>{c.label}</b><small>{c.hint}</small>
              </button>
            ))}
          </div>
        )}
        {fileSlot && (!fileSlot.forChoice || choice === fileSlot.forChoice) && (
          <div className={`name-drop ${over ? 'is-over' : ''} ${file ? 'has-file' : ''}`} role="button" tabIndex={0} aria-label={fileSlot.label}
            onClick={() => fileInput.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click() } }}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); takeFile(e.dataTransfer.files?.[0]) }}>
            <input ref={fileInput} type="file" accept={fileSlot.input} hidden onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = '' }} />
            <Icon name={fileSlot.icon} size={26} color="#E84855" />
            {file
              ? <span className="name-drop-txt"><b className="w-ellipsis">{file.name}</b><span className="muted">{fileSlot.ready}</span></span>
              : <span className="name-drop-txt"><b>{fileSlot.label}</b><span className="muted">{fileSlot.hint}</span></span>}
            {file && <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); setFile(null) }} aria-label="Quitar el archivo" title="Quitar"><Icon name="close" size={16} /></button>}
          </div>
        )}
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
