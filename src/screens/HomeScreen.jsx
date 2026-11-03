import { useState } from 'react'
import OptionsMenu from '../components/OptionsMenu.jsx'
import FileUploader from '../components/FileUploader.jsx'
import NotesEditor from '../components/NotesEditor.jsx'
import { buildMaterial } from '../services/aiService.js'

/**
 * Pantalla 1: elegir el material.
 *  - menuOpen: ¿se ven las 3 opciones?
 *  - option:   'pdf' | 'pptx' | 'notes' | null
 */
export default function HomeScreen({ onMaterialReady, onOpenAssistant }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [option, setOption] = useState(null)

  const selectOption = (id) => {
    setOption(id)
    setMenuOpen(false)
  }

  const submit = async (input) => {
    onMaterialReady(await buildMaterial(option, input))
  }

  return (
    <section className="wf-content">
      {option === null && (
        <>
          <p className="wf-placeholder">[ Welcome text / explanation ]</p>

          <button className="wf-button wf-main-button" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕ Close' : '+ Add material'}
          </button>

          {menuOpen && <OptionsMenu onSelect={selectOption} />}

          <button className="wf-link" onClick={onOpenAssistant}>Or chat with the assistant →</button>
        </>
      )}

      {(option === 'pdf' || option === 'pptx') && (
        <FileUploader type={option} onSubmit={submit} onBack={() => setOption(null)} />
      )}

      {option === 'notes' && <NotesEditor onSubmit={submit} onBack={() => setOption(null)} />}
    </section>
  )
}
