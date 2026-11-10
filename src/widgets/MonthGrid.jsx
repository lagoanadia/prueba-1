import { addDays, todayISO, weekDays, weekStart } from '../lib/dates.js'
import PackedGrid from './PackedGrid.jsx'
import { useBox } from './useBox.js'

/** Gris de un día sin marcar: se intuye sin llamar la atención. */
export const EMPTY = '#D7D9DB'
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const GAP = 6
const LABEL_H = 16

/**
 * Cuadrícula de 7 columnas (lunes a domingo) con cuadrados perfectos que llenan el hueco del widget.
 * `days`: fechas en orden (null = hueco). Con `labels`, arriba van las letras L M X J V S D.
 */
function Grid7({ days, labels, colorFor, onDay, max = 56 }) {
  const [ref, size] = useBox()
  const today = todayISO()
  const rows = Math.ceil(days.length / 7)
  const room = size.h - (labels ? LABEL_H + 6 : 0)
  const cell = Math.max(8, Math.min(Math.floor(Math.min((size.w + GAP) / 7 - GAP, (room + GAP) / rows - GAP)), max))
  // El sobrante se reparte en los huecos para llenar el widget sin deformar los cuadrados
  const spread = (total, n) => (n > 1 ? Math.max(GAP, Math.min((total - n * cell) / (n - 1), cell * 0.5)) : GAP)
  const gapX = spread(size.w, 7)
  const gapY = spread(room, rows)
  const cols = { gridTemplateColumns: `repeat(7, ${cell}px)`, columnGap: gapX }
  return (
    <div className="g7-box" ref={ref}>
      {size.w > 0 && (
        <div className="g7">
          {labels && <div className="g7-dow" style={cols} aria-hidden="true">{DOW.map((d) => <span key={d}>{d}</span>)}</div>}
          <div className="g7-grid" style={{ ...cols, rowGap: gapY }}>
            {days.map((d, i) => (d
              ? <button key={d} className={`px ${d === today ? 'px-today' : ''}`} style={{ width: cell, height: cell, background: colorFor(d) }}
                  onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} />
              : <span key={`e${i}`} />))}
          </div>
        </div>
      )}
    </div>
  )
}

/** El mes como un bloque de cuadrados perfectos que llena el widget. */
export default function MonthGrid(props) {
  const today = todayISO()
  const [y, m] = today.split('-').map(Number)
  const n = new Date(y, m, 0).getDate()
  const days = Array.from({ length: n }, (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
  return <PackedGrid {...props} days={days} />
}

/** Esta semana y la anterior, en dos filas de 7. */
export function TwoWeeks(props) {
  const today = todayISO()
  return <Grid7 {...props} days={[...weekDays(addDays(weekStart(today), -7)), ...weekDays(today)]} />
}

/** Esta semana en una línea de 7. */
export function OneWeek(props) {
  return <Grid7 {...props} days={weekDays(todayISO())} labels max={64} />
}
