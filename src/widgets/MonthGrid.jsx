import { addDays, monthWeeks, todayISO, weekDays, weekStart } from '../lib/dates.js'

/** Gris de un día sin marcar: se intuye sin llamar la atención. */
export const EMPTY = '#D7D9DB'
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const Dow = () => <div className="px-dow" aria-hidden="true">{DOW.map((d) => <span key={d}>{d}</span>)}</div>

/** Calendario del mes en "píxeles": una fila por semana (lunes a domingo). colorFor(fecha) decide el color; onDay(fecha) al tocar (solo hasta hoy). */
export default function MonthGrid({ colorFor, onDay }) {
  const today = todayISO()
  return (
    <div className="month-wrap">
      <Dow />
      <div className="month">
        {monthWeeks(today).flat().map((d, i) =>
          d ? (
            <button key={d} className={`px ${d === today ? 'px-today' : ''}`} style={{ background: colorFor(d) }}
              onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} />
          ) : <span key={`e${i}`} />
        )}
      </div>
    </div>
  )
}

/** Esta semana y la anterior, en dos filas de 7 (lunes a domingo), sin letras para que los cuadrados sean lo más grandes posible. */
export function TwoWeeks({ colorFor, onDay }) {
  const today = todayISO()
  const days = [...weekDays(addDays(weekStart(today), -7)), ...weekDays(today)]
  return (
    <div className="month-wrap two">
      <div className="month">
        {days.map((d) => (
          <button key={d} className={`px ${d === today ? 'px-today' : ''}`} style={{ background: colorFor(d) }}
            onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} />
        ))}
      </div>
    </div>
  )
}
