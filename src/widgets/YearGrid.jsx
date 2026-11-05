import { todayISO, yearWeeks } from '../lib/dates.js'

/**
 * El año entero en píxeles (columnas = semanas, lunes arriba). Se pinta en dos bandas
 * (enero-junio y julio-diciembre) para que los píxeles sean más grandes y llenen el widget.
 */
export default function YearGrid({ colorFor, onDay }) {
  const today = todayISO()
  const cells = yearWeeks(today)
  const half = Math.ceil(cells.length / 14) * 7 // corte en una semana completa, a mitad de año
  const cell = (d, i) =>
    d ? (
      <button key={d} className={`ypx ${d === today ? 'px-today' : ''}`} style={{ background: colorFor(d) }}
        onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} title={d} />
    ) : <span key={`e${i}`} />
  return (
    <div className="year-wrap">
      <div className="year">{cells.slice(0, half).map(cell)}</div>
      <div className="year">{cells.slice(half).map((d, i) => cell(d, half + i))}</div>
    </div>
  )
}
