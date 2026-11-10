import PackedGrid from './PackedGrid.jsx'
import { addDays, todayISO } from '../lib/dates.js'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** El año en 12 mini-meses (4 por fila), cada uno con sus semanas en filas de 7 (lunes a domingo). */
export default function YearGrid({ colorFor, onDay }) {
  const today = todayISO()
  const year = Number(today.slice(0, 4))
  return (
    <div className="year-months">
      {MONTHS.map((name, m) => {
        const days = new Date(year, m + 1, 0).getDate()
        const offset = (new Date(year, m, 1).getDay() + 6) % 7
        return (
          <div key={name} className="ymonth">
            <span className="ymonth-name">{name}</span>
            <div className="ymonth-grid">
              {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const d = iso(year, m, i + 1)
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

/** El año entero como un bloque de cuadrados que llena el widget (45 columnas si caben, igual en todos los widgets). */
export function YearMass({ colorFor, onDay }) {
  const year = Number(todayISO().slice(0, 4))
  const total = (new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / 86400000
  const days = Array.from({ length: total }, (_, i) => addDays(`${year}-01-01`, i))
  return <PackedGrid days={days} colorFor={colorFor} onDay={onDay} preferredCols={45} max={40} />
}
