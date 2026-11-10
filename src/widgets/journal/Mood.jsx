import { useState } from 'react'
import MonthGrid, { EMPTY, TwoWeeks } from '../MonthGrid.jsx'
import YearGrid from '../YearGrid.jsx'
import Chips from '../Chips.jsx'
import { todayISO } from '../../lib/dates.js'

export const MOODS = [
  { id: 'bueno', label: 'Bueno', color: '#3DDC97' },
  { id: 'regular', label: 'Mejorable', color: '#F9DC5C' },
  { id: 'malo', label: 'Malo', color: '#E84855' },
]
const colorOf = (id) => MOODS.find((m) => m.id === id)?.color ?? EMPTY
const RANGES = [{ id: 'mes', label: 'Mes' }, { id: 'año', label: 'Año' }]

/** Mood tracker. S: elegir hoy · T: + mes · M: + 2 semanas · L: + Mes / Año (tocar un día cambia su ánimo). */
export default function Mood({ size, data, update }) {
  const today = todayISO()
  const moods = data.moods ?? {}
  const [range, setRange] = useState('año')
  const set = (date, mood) => update((d) => ({ ...d, moods: { ...d.moods, [date]: mood } }))
  const cycle = (date) => {
    const i = MOODS.findIndex((m) => m.id === moods[date])
    set(date, i === MOODS.length - 1 ? null : MOODS[i + 1].id) // bueno → mejorable → malo → nada
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
  if (size === 'T') return <>{chips}<div className="fill"><MonthGrid colorFor={(d) => colorOf(moods[d])} onDay={cycle} /></div></>
  if (size === 'M') return <>{chips}<div className="fill"><TwoWeeks colorFor={(d) => colorOf(moods[d])} onDay={cycle} /></div></>
  return (
    <>
      {chips}
      <Chips options={RANGES} value={range} onChange={setRange} small />
      <div className="slide-in fill" key={range}>
        {range === 'mes'
          ? <MonthGrid colorFor={(d) => colorOf(moods[d])} onDay={cycle} />
          : <YearGrid colorFor={(d) => colorOf(moods[d])} onDay={cycle} />}
      </div>
    </>
  )
}
