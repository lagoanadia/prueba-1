import { useState } from 'react'

export default function NotesEditor({ onSubmit, onBack, cargando }) {
  const [texto, setTexto] = useState('')

  return (
    <div className="wf-panel">
      <button className="wf-link" onClick={onBack}>← Volver</button>
      <h2>Escribir notas</h2>

      <textarea
        className="wf-box wf-textarea"
        placeholder="[ Escribe tus notas aquí ]"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <button className="wf-button" disabled={!texto.trim() || cargando} onClick={() => onSubmit(texto)}>
        {cargando ? 'Procesando…' : 'Procesar con IA'}
      </button>
    </div>
  )
}
