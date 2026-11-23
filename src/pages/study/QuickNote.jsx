import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { sanitize } from '../../lib/richText.js'
import { SUBJECT_COLORS, soft } from './helpers.js'

const FORMATS = [
  ['list', 'Puntos', () => document.execCommand('insertUnorderedList')],
  ['listnum', 'Numerada', () => document.execCommand('insertOrderedList')],
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
        onInput={(e) => {
          // «- », «* » o «1. » al empezar una línea la convierten en lista (como en los documentos)
          const sel = window.getSelection(); const nd = sel?.anchorNode
          if (/^insert/.test(e.nativeEvent?.inputType ?? '') && /^[ \u00A0]$/.test(e.nativeEvent?.data ?? '') && nd?.nodeType === 3 && sel.isCollapsed) {
            const before = nd.textContent.slice(0, sel.anchorOffset)
            const first = !nd.previousSibling || nd.previousSibling.nodeName === 'BR' || nd.previousSibling.nodeType === 1 // primer texto de su línea
            const m = first && /^(?:[-*•]|1[.)])[ \u00A0]$/.exec(before)
            if (m && !nd.parentElement.closest('li')) {
              // primero se convierte la línea en lista y luego se quita el marcador del principio (así el navegador no mezcla líneas)
              const n = m[0].length
              document.execCommand(/^1/.test(m[0]) ? 'insertOrderedList' : 'insertUnorderedList')
              const s2 = window.getSelection(); const t = s2?.anchorNode
              if (t?.nodeType === 3 && t.textContent.slice(0, n) === m[0]) {
                const off = s2.anchorOffset
                const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, n); r.deleteContents()
                const c = document.createRange(); c.setStart(t, Math.max(0, off - n)); c.collapse(true); s2.removeAllRanges(); s2.addRange(c)
              }
            }
          }
          onChange({ ...note, html: sanitize(e.currentTarget.innerHTML) })
        }} />
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
