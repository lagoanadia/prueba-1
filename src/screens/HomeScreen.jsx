import { useState } from 'react'
import OptionsMenu from '../components/OptionsMenu.jsx'
import FileUploader from '../components/FileUploader.jsx'
import NotesEditor from '../components/NotesEditor.jsx'
import { procesarArchivo, procesarNotas } from '../services/aiService.js'

/**
 * Pantalla principal.
 *
 * Estado:
 *  - menuAbierto: ¿se ven las 3 opciones?
 *  - opcion:      qué opción eligió el usuario ('pdf' | 'pptx' | 'notas' | null)
 *  - resultado:   lo que devuelve la IA (de momento, un texto falso)
 */
export default function HomeScreen() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [opcion, setOpcion] = useState(null)
  const [resultado, setResultado] = useState('')
  const [cargando, setCargando] = useState(false)

  const elegirOpcion = (id) => {
    setOpcion(id)
    setMenuAbierto(false)
    setResultado('')
  }

  const volver = () => {
    setOpcion(null)
    setResultado('')
  }

  // Punto de unión UI <-> lógica IA: la UI solo llama a una función del servicio.
  const enviar = async (datos) => {
    setCargando(true)
    try {
      const respuesta =
        opcion === 'notas' ? await procesarNotas(datos) : await procesarArchivo(datos, opcion)
      setResultado(respuesta)
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="wf-screen">
      <header className="wf-box wf-header">[ Logo / Nombre de la app ]</header>

      <section className="wf-content">
        {opcion === null && (
          <>
            <p className="wf-placeholder">[ Texto de bienvenida / explicación ]</p>

            <button className="wf-button wf-main-button" onClick={() => setMenuAbierto(!menuAbierto)}>
              {menuAbierto ? '✕ Cerrar' : '+ Empezar'}
            </button>

            {menuAbierto && <OptionsMenu onSelect={elegirOpcion} />}
          </>
        )}

        {(opcion === 'pdf' || opcion === 'pptx') && (
          <FileUploader tipo={opcion} onSubmit={enviar} onBack={volver} cargando={cargando} />
        )}

        {opcion === 'notas' && <NotesEditor onSubmit={enviar} onBack={volver} cargando={cargando} />}

        {resultado && (
          <div className="wf-box wf-result">
            <strong>[ Resultado IA ]</strong>
            <p>{resultado}</p>
          </div>
        )}
      </section>

      <footer className="wf-box wf-footer">[ Footer / navegación ]</footer>
    </main>
  )
}
