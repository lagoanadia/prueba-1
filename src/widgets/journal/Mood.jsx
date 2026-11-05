import MonthGrid from '../MonthGrid.jsx'
import { lastDays, todayISO } from '../../lib/dates.js'

export const MOODS = [
  { id: 'bueno', label: 'Bueno', color: '#3DDC97' },
  { id: 'regular', label: 'Regular', color: '#F9DC5C' },
  { id: 'malo', label: 'Malo', color: '#E84855' },
]
const colorOf = (id) => MOODS.find((m) => m.id === id)?.color ?? '#F1F3F4'

/** Mood tracker. S: elegir hoy · M: + últimas 2 semanas · L: + mes (tocar un día cambia su ánimo). */
export default function Mood({ size, data, update }) {
  const today = todayISO()
  const moods = data.moods ?? {}
  const set = (date, mood) => update((d) => ({ ...d, moods: { ...d.moods, [date]: mood } }))
  const cycle = (date) => {
    const i = MOODS.findIndex((m) => m.id === moods[date])
    set(date, i === MOODS.length - 1 ? null : MOODS[i + 1].id) // bueno → regular → malo → nada
  }

  const chips = (
    <div className={`chips ${size === 'S' ? 'chips-dots' : ''}`}>
      {MOODS.map((m) => (
        <button key={m.id} className={`chip ${moods[today] === m.id ? 'chip-on' : ''}`} style={{ '--c': m.color }}
          onClick={() => set(today, moods[today] === m.id ? null : m.id)} aria-label={m.label}>
          {size !== 'S' && m.label}
        </button>
      ))}
    </div>
  )

  if (size === 'S') return <div className="w-center"><span className="w-hint">Hoy</span>{chips}</div>
  return (
    <>
      {chips}
      {size === 'M' ? (
        <div className="px-row">{lastDays(14).map((d) => <span key={d} className="px" style={{ background: colorOf(moods[d]) }} />)}</div>
      ) : (
        <MonthGrid colorFor={(d) => colorOf(moods[d])} onDay={cycle} cell={22} />
      )}
    </>
  )
}
