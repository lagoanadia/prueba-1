// Lista de opciones como DATOS: para añadir una nueva solo tocas este array.
const OPCIONES = [
  { id: 'pdf', icono: '📄', texto: 'Subir PDF' },
  { id: 'pptx', icono: '📊', texto: 'Subir PowerPoint' },
  { id: 'notas', icono: '📝', texto: 'Escribir notas' },
]

export default function OptionsMenu({ onSelect }) {
  return (
    <ul className="wf-options">
      {OPCIONES.map((op) => (
        <li key={op.id}>
          <button className="wf-button wf-option" onClick={() => onSelect(op.id)}>
            <span className="wf-icon">{op.icono}</span>
            {op.texto}
          </button>
        </li>
      ))}
    </ul>
  )
}
