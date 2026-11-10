import { addDays, todayISO, weekStart } from '../lib/dates.js'

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

/** El año como una masa de cuadrados (semanas en columnas, lunes arriba): solo las últimas `weeks` semanas, siempre cuadrados. */
export function YearMass({ colorFor, onDay, weeks = 37 }) {
  const today = todayISO()
  const year = today.slice(0, 4)
  const first = weekStart(`${year}-01-01`)
  const all = Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(first, w * 7 + i)))
  const shown = all.slice(-weeks).flat()
  return (
    <div className="year-mass" style={{ '--n': weeks }}>
      {shown.map((d) => (d.startsWith(year)
        ? <button key={d} className={`ypx ${d === today ? 'px-today' : ''}`} style={{ background: colorFor(d) }} onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} title={d} />
        : <span key={d} />))}
    </div>
  )
}
