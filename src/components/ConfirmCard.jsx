import { SECTIONS } from '../data/sections.js'

/**
 * Confirmación antes de guardar nada: el asistente PROPONE, el usuario DECIDE.
 * Así un error de transcripción o de la IA nunca ensucia tus datos.
 */
export default function ConfirmCard({ actions, onConfirm, onCancel }) {
  return (
    <div className="wf-box wf-confirm">
      <small>[ Assistant wants to add ]</small>
      <ul>
        {actions.map((a, i) => {
          const section = SECTIONS.find((s) => s.id === a.section)
          return (
            <li key={i}>
              <span className="wf-dot" style={{ background: section?.color }} />
              <strong>{section?.label ?? a.section}:</strong> {a.title}
            </li>
          )
        })}
      </ul>
      <div className="wf-confirm-buttons">
        <button className="wf-button" onClick={onCancel}>Cancel</button>
        <button className="wf-button wf-button-primary" onClick={onConfirm}>Confirm</button>
      </div>
    </div>
  )
}
