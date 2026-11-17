import PackedGrid from './PackedGrid.jsx'
import { addDays, todayISO, yearStart } from '../lib/dates.js'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Los 12 meses desde el día que empezaste (4 por fila), cada uno con sus semanas en filas de 7 (lunes a domingo). Los días anteriores al comienzo quedan vacíos. */
export default function YearGrid({ colorFor, onDay, since }) {
  const today = todayISO()
  const start = yearStart(since, today)
  const end = addDays(start, 364)
  const [sy, sm] = start.split('-').map(Number)
  return (
    <div className="year-months">
      {Array.from({ length: 12 }, (_, k) => {
        const first = new Date(sy, sm - 1 + k, 1)
        const year = first.getFullYear()
        const m = first.getMonth()
        const days = new Date(year, m + 1, 0).getDate()
        const offset = (first.getDay() + 6) % 7
        return (
          <div key={`${year}-${m}`} className="ymonth">
            <span className="ymonth-name">{MONTHS[m]}</span>
            <div className="ymonth-grid">
              {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const d = iso(year, m, i + 1)
                if (d < start || d > end) return <span key={d} />
                return <button key={d} className={`ypx ${d === today ? 'px-today' : ''}`} style={{ background: colorFor(d) }}
                  onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} title={d} />
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Los 365 días desde que empezaste como un bloque de cuadrados que llena el widget (45 columnas si caben, igual en todos los widgets). */
export function YearMass({ colorFor, onDay, since }) {
  const start = yearStart(since, todayISO())
  const days = Array.from({ length: 365 }, (_, i) => addDays(start, i))
  return <PackedGrid days={days} colorFor={colorFor} onDay={onDay} preferredCols={45} max={40} />
}
