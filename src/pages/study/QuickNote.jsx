import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { sanitize } from '../../lib/richText.js'
import { SUBJECT_COLORS, soft } from './helpers.js'

const FORMATS = [
  ['list', 'Puntos', () => document.execCommand('insertUnorderedList')],
  ['bold', 'Negrita', () => document.execCommand('bold')],
  ['italic', 'Cursiva', () => document.execCommand('italic')],
  ['underline', 'Subrayado', () => document.execCommand('underline')],
]

/**
 * Nota rápida: un cuadrado de nuestro estilo. En reposo solo se ve el contenido;
 * al tocarla aparecen la barra de formato y el círculo de color (que despliega los colores).
 */
export default function QuickNote({ note, onChange, onDelete }) {
  const ref = useRef(null)
  const box = useRef(null)
  const [active, setActive] = useState(false)
  const [palette, setPalette] = useState(false)
  useEffect(() => { if (ref.current) ref.current.innerHTML = sanitize(note.html) }, []) // solo al montar
  const color = note.color ?? SUBJECT_COLORS[4]

  // Al salir de la nota (foco fuera) se esconden los controles
  const leave = (e) => { if (!box.current?.contains(e.relatedTarget)) { setActive(false); setPalette(false) } }

  return (
    <div ref={box} className={`quick-note ${active ? 'is-active' : ''}`} style={{ background: soft(color, 30) }} onFocus={() => setActive(true)} onBlur={leave}>
      {active && (
        <div className="note-bar" role="toolbar" aria-label="Formato de la nota">
          {FORMATS.map(([icon, name, run]) => (
            <button key={icon} className="icon-btn" title={name} aria-label={name} onMouseDown={(e) => { e.preventDefault(); run(); onChange({ ...note, html: sanitize(ref.current.innerHTML) }) }}><Icon name={icon} size={18} /></button>
          ))}
          <span className="note-sep" />
          <button className="icon-btn" title="Borrar nota" aria-label="Borrar nota" onClick={() => { if (!ref.current?.innerText.trim() || window.confirm('¿Borrar esta nota?')) onDelete() }}><Icon name="trash" size={18} /></button>
        </div>
      )}
      <div ref={ref} className="note-text" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Nota rápida" data-empty="Escribe lo que quieras"
        onInput={(e) => onChange({ ...note, html: sanitize(e.currentTarget.innerHTML) })} />
      {active && (
        <div className="note-colors">
          {palette
            ? SUBJECT_COLORS.map((c) => <button key={c} className={`swatch-dot ${c === color ? 'on' : ''}`} style={{ background: soft(c, 30) }} aria-label={`Color ${c}`} aria-pressed={c === color} onClick={() => { onChange({ ...note, color: c }); setPalette(false) }} />)
            : <button className="swatch-dot on" style={{ background: soft(color, 30) }} aria-label="Cambiar color" aria-expanded="false" onClick={() => setPalette(true)} />}
        </div>
      )}
    </div>
  )
}
