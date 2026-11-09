import Icon from './Icon.jsx'

const WIDTHS = [[1, 'Estrecho', 'shape-w1'], [2, 'Mediano', 'shape-w2'], [3, 'Ancho', 'shape-w3']]

/**
 * Controles de edición de un bloque de página (Estudios, Trabajo, proyecto), iguales que los de los widgets:
 * × para quitar, flechas para mover y el dock de tamaños abajo con el indicador que se desliza.
 */
export default function BlockEdit({ span, onSpan, onRemove, onMove, first, last, name = 'bloque', widths = [1, 2, 3] }) {
  const options = WIDTHS.filter(([n]) => widths.includes(n))
  return (
    <>
      <button className="w-remove" onClick={onRemove} aria-label={`Quitar ${name}`}>×</button>
      <div className="block-move">
        <button className="icon-btn" onClick={() => onMove(-1)} disabled={first} aria-label="Mover antes"><Icon name="left" size={16} /></button>
        <button className="icon-btn" onClick={() => onMove(1)} disabled={last} aria-label="Mover después"><Icon name="right" size={16} /></button>
      </div>
      {options.length > 1 && (
        <div className="size-dock" style={{ '--idx': options.findIndex(([n]) => n === span) }} role="radiogroup" aria-label={`Tamaño de ${name}`}>
          <span className="size-dock-pill" aria-hidden="true" />
          {options.map(([n, label, shape]) => (
            <button key={n} role="radio" aria-checked={span === n} aria-label={label} className={span === n ? 'on' : ''} onClick={() => span !== n && onSpan(n)}>
              <span className={`shape ${shape}`} />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
