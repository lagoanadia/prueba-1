import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

/**
 * Modo edición: una fila con lo que aún no tienes en la pantalla. Toca una pieza para añadirla al final
 * o arrástrala al sitio donde la quieras. options = [{ type, label, icon?, color? }].
 */
export default function AddRow({ options, onPick, tileDown, ghost }) {
  return (
    <>
      {options.length > 0 && (
        <div className="add-square add-row" role="group" aria-label="Añadir">
          <span className="add-row-plus" aria-hidden="true"><Icon name="plus" size={20} /></span>
          <div className="add-row-list">
            {options.map((o) => (
              <button key={o.type} className="add-tile" onPointerDown={tileDown ? (e) => tileDown(e, o) : undefined} onClick={() => onPick(o.type)} title="Toca para añadir o arrástralo a su sitio">
                {o.icon ? <Icon name={o.icon} size={22} /> : <span className="dot" style={{ background: o.color }} />}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {ghost && createPortal(<div className="add-ghost" style={{ left: ghost.x, top: ghost.y }}>{ghost.label}</div>, document.body)}
    </>
  )
}
