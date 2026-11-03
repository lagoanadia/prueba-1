import { useState } from 'react'

// Qué extensiones acepta el <input type="file"> según el tipo elegido.
const CONFIG = {
  pdf: { title: 'Upload PDF', accept: '.pdf,application/pdf' },
  pptx: {
    title: 'Upload PowerPoint',
    accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
}

export default function FileUploader({ type, onSubmit, onBack }) {
  const [file, setFile] = useState(null)
  const { title, accept } = CONFIG[type]

  return (
    <div className="wf-panel">
      <button className="wf-link" onClick={onBack}>← Back</button>
      <h2>{title}</h2>

      <label className="wf-box wf-dropzone">
        {file ? `✔ ${file.name}` : '[ Drop a file here or tap to choose ]'}
        <input type="file" accept={accept} hidden onChange={(e) => setFile(e.target.files[0] ?? null)} />
      </label>

      <button className="wf-button" disabled={!file} onClick={() => onSubmit(file)}>
        Continue to assistant →
      </button>
    </div>
  )
}
