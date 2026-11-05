import { monthWeeks, todayISO } from '../lib/dates.js'

/** Calendario del mes en "píxeles". colorFor(fecha) decide el color; onDay(fecha) al tocar (solo hasta hoy). */
export default function MonthGrid({ colorFor, onDay, cell }) {
  const today = todayISO()
  return (
    <div className="month" style={cell ? { '--cell': `${cell}px` } : undefined}>
      {monthWeeks(today).flat().map((d, i) =>
        d ? (
          <button key={d} className={`px ${d === today ? 'px-today' : ''}`} style={{ background: colorFor(d) }}
            onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} />
        ) : <span key={`e${i}`} />
      )}
    </div>
  )
}
