import { todayISO } from '../lib/dates.js'
import { useBox } from './useBox.js'

const GAP = 2 // hueco mínimo entre cuadrados

/**
 * Bloque de cuadrados perfectos que llena el hueco del widget: los días van de izquierda a derecha y de arriba abajo
 * y solo la última fila puede quedarse sin llegar al final. Sin deslizar. `preferredCols` fija las columnas si caben
 * en el alto (así dos widgets distintos usan el mismo tamaño); si no, se busca el cuadrado más grande que quepa.
 */
export default function PackedGrid({ days, colorFor, onDay, preferredCols, max = 64 }) {
  const [box, size] = useBox()
  const today = todayISO()
  const total = days.length

  let cell = 4
  if (preferredCols) {
    cell = Math.floor((size.w + GAP) / preferredCols - GAP)
    if (Math.ceil(total / preferredCols) * (cell + GAP) - GAP <= size.h) return render(cell)
  }
  for (let c = max; c >= 4; c -= 0.25) {
    if (Math.floor((size.w + GAP) / (c + GAP)) * Math.floor((size.h + GAP) / (c + GAP)) >= total) { cell = c; break }
  }
  return render(cell)

  function render(c0) {
    const c = Math.max(4, Math.min(c0, max))
    const cols = Math.max(1, Math.floor((size.w + GAP) / (c + GAP)))
    const rows = Math.ceil(total / cols)
    // El sobrante se reparte en los huecos para llenar el widget de lado a lado y de arriba abajo
    const spread = (room, n) => (n > 1 ? Math.max(GAP, Math.min((room - n * c) / (n - 1), c * 0.5)) : GAP)
    return (
      <div className="year-mass-box" ref={box}>
        {size.w > 0 && (
          <div className="year-mass" style={{ gridTemplateColumns: `repeat(${cols}, ${c}px)`, gap: `${spread(size.h, rows)}px ${spread(size.w, cols)}px` }}>
            {days.map((d) => (
              <button key={d} className={`ypx ${d === today ? 'px-today' : ''}`} style={{ width: c, height: c, background: colorFor(d) }}
                onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} title={d} />
            ))}
          </div>
        )}
      </div>
    )
  }
}
