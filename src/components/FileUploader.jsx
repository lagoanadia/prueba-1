import { useState } from 'react'

// Qué extensiones acepta el <input type="file"> según el tipo elegido.
const CONFIG = {
  pdf: { titulo: 'Subir PDF', accept: '.pdf,application/pdf' },
  pptx: {
    titulo: 'Subir PowerPoint',
    accept: '.ppt,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
}

export default function FileUploader({ tipo, onSubmit, onBack, cargando }) {
  const [archivo, setArchivo] = useState(null)
  const { titulo, accept } = CONFIG[tipo]

  return (
    <div className="wf-panel">
      <button className="wf-link" onClick={onBack}>← Volver</button>
      <h2>{titulo}</h2>

      <label className="wf-box wf-dropzone">
        {archivo ? `✔ ${archivo.name}` : '[ Arrastra aquí o pulsa para elegir archivo ]'}
        <input type="file" accept={accept} hidden onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
      </label>

      <button className="wf-button" disabled={!archivo || cargando} onClick={() => onSubmit(archivo)}>
        {cargando ? 'Procesando…' : 'Procesar con IA'}
      </button>
    </div>
  )
}
