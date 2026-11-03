// Lista de opciones como DATOS: para añadir una nueva solo tocas este array.
const OPTIONS = [
  { id: 'pdf', icon: '📄', label: 'Upload PDF' },
  { id: 'pptx', icon: '📊', label: 'Upload PowerPoint' },
  { id: 'notes', icon: '📝', label: 'Write notes' },
]

export default function OptionsMenu({ onSelect }) {
  return (
    <ul className="wf-options">
      {OPTIONS.map((op) => (
        <li key={op.id}>
          <button className="wf-button wf-option" onClick={() => onSelect(op.id)}>
            <span className="wf-icon">{op.icon}</span>
            {op.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
