import { useEffect, useState } from 'react'
import MonthGrid, { EMPTY, OneWeek, TwoWeeks } from '../MonthGrid.jsx'
import YearGrid, { YearMass } from '../YearGrid.jsx'
import Icon from '../../components/Icon.jsx'
import MoodAnalysis from './MoodAnalysis.jsx'
import Chips from '../Chips.jsx'
import { todayISO } from '../../lib/dates.js'
import { sinceFromData } from '../since.js'

export const MOODS = [
  { id: 'bueno', label: 'Bueno', color: '#3DDC97' },
  { id: 'regular', label: 'Mejorable', color: '#F9DC5C' },
  { id: 'malo', label: 'Malo', color: '#E84855' },
]
const colorOf = (id) => MOODS.find((m) => m.id === id)?.color ?? EMPTY
const RANGES = [{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }, { id: 'año', label: 'Año' }]

/** Mood tracker. S: elegir hoy · T: + mes · M: + 2 semanas · L: + Mes / Año (tocar un día cambia su ánimo). */
export default function Mood({ size, data, update }) {
  const today = todayISO()
  const moods = data.moods ?? {}
  const [range, setRange] = useState('año')
  const [yearView, setYearView] = useState('masa') // 'masa' | 'meses'
  const [analysis, setAnalysis] = useState(false)
  const since = sinceFromData(data, today)
  useEffect(() => { if (!data.since) update((d) => (d.since ? d : { ...d, since })) }, []) // eslint-disable-line react-hooks/exhaustive-deps -- se guarda el día en que empezaste
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
  // M: a la izquierda cómo estás hoy (en columna) y a la derecha las dos últimas semanas con sus letras
  if (size === 'M') return <div className="mood-M">{chips}<div className="fill"><TwoWeeks labels colorFor={(d) => colorOf(moods[d])} onDay={cycle} /></div></div>
  const colorFor = (d) => colorOf(moods[d])
  const yearGrid = yearView === 'masa'
    ? <YearMass colorFor={colorFor} onDay={cycle} since={since} />
    : <YearGrid colorFor={colorFor} onDay={cycle} since={since} />
  return (
    <>
      {chips}
      <div className="mood-bar">
        <Chips options={RANGES} value={range} onChange={setRange} small />
        {range === 'año' && (
          <>
            <button className={`mood-view ${yearView === 'meses' ? 'on' : ''}`} onClick={() => setYearView('meses')} aria-label="Año por meses" title="Por meses"><Icon name="table" size={15} /></button>
            <button className={`mood-view ${yearView === 'masa' ? 'on' : ''}`} onClick={() => setYearView('masa')} aria-label="Año en masa" title="En masa"><Icon name="tree" size={15} /></button>
            <span className="fd-grow" />
            <button className={`chip ${analysis ? 'chip-on' : ''}`} onClick={() => setAnalysis(!analysis)} aria-pressed={analysis}><Icon name="chart" size={14} /> Análisis</button>
          </>
        )}
      </div>
      <div className="slide-in fill" key={range}>
        {range === 'semana' && <OneWeek colorFor={colorFor} onDay={cycle} />}
        {range === 'mes' && <MonthGrid colorFor={colorFor} onDay={cycle} />}
        {range === 'año' && (
          <div className="mood-year">
            <div className="mood-year-grid" key={yearView + analysis}>{yearGrid}</div>
            {analysis && <MoodAnalysis moods={moods} />}
          </div>
        )}
      </div>
    </>
  )
}
