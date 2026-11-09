import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { sanitize } from '../lib/richText.js'

const TOOLS = [
  ['title', 'Título', () => document.execCommand('formatBlock', false, 'h2')],
  ['bold', 'Negrita', () => document.execCommand('bold')],
  ['italic', 'Cursiva', () => document.execCommand('italic')],
  ['underline', 'Subrayado', () => document.execCommand('underline')],
  ['list', 'Lista con puntos', () => document.execCommand('insertUnorderedList')],
  ['marker', 'Resaltar', () => document.execCommand('hiliteColor', false, '#FDF5CE')],
]

/**
 * Editor de documentos: texto con formato (título, negrita, cursiva, subrayado, puntos, resaltado).
 * `html` es el contenido guardado; `onChange(html)` se llama al escribir.
 * Para cambiar de documento, ponle una `key` distinta.
 */
export default function DocEditor({ html, onChange, status, label = 'Documento' }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.innerHTML = sanitize(html) }, []) // solo al montar

  return (
    <div className="card doc">
      <div className="doc-bar" role="toolbar" aria-label="Formato">
        {TOOLS.map(([icon, name, run]) => (
          // onMouseDown: así el texto seleccionado no pierde el foco al pulsar
          <button key={icon} className="icon-btn doc-tool" title={name} aria-label={name} onMouseDown={(e) => { e.preventDefault(); run(); onChange(sanitize(ref.current.innerHTML)) }}>
            <Icon name={icon} size={20} />
          </button>
        ))}
        <span className="doc-status" role="status">{status}</span>
      </div>
      <div ref={ref} className="doc-page" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label}
        onInput={(e) => onChange(sanitize(e.currentTarget.innerHTML))} />
    </div>
  )
}
