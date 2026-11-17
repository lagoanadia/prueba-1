import { useEffect, useState } from 'react'
import { EMPTY } from '../MonthGrid.jsx'
import Icon from '../../components/Icon.jsx'
import MoodAnalysis from './MoodAnalysis.jsx'
import Chips from '../Chips.jsx'
import { addDays, todayISO, weekStart } from '../../lib/dates.js'
import { sinceFromData } from '../since.js'
import { DayCalendar, YearCalendar } from './HabitViews.jsx'

export const MOODS = [
  { id: 'bueno', label: 'Bueno', color: '#3DDC97' },
  { id: 'regular', label: 'Mejorable', color: '#F9DC5C' },
  { id: 'malo', label: 'Malo', color: '#E84855' },
]
const colorOf = (id) => MOODS.find((m) => m.id === id)?.color ?? EMPTY
// Caras del tamaño mediano: nombre corto y boca (sonrisa, recta, triste)
const FACE = { bueno: 'Bien', regular: 'Regular', malo: 'Mal' }
const MOUTH = { bueno: 'M10 19q6 6 12 0', regular: 'M10.5 21h11', malo: 'M10 23q6-6 12 0' }
const RANGES = [{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }, { id: 'año', label: 'Año' }]

/** Mood tracker. S: elegir hoy · T: + mes · M: + 2 semanas · L: + Mes / Año (tocar un día cambia su ánimo). */
export default function Mood({ size, data, update }) {
  const today = todayISO()
  const moods = data.moods ?? {}
  const [range, setRange] = useState('semana')
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
  // M: a la izquierda cómo estás hoy (en columna) y a la derecha las dos últimas semanas con sus letras
  // M: a la izquierda tres caras para decir cómo estás hoy; a la derecha dos semanas con la fecha de cada día
  // Tres caras para decir cómo estás hoy (tamaño mediano y grande)
  const faces = (
    <div className="mood-faces">
      {MOODS.map((m) => (
        <button key={m.id} className={`mood-face-btn ${moods[today] === m.id ? 'on' : ''}`} onClick={() => set(today, moods[today] === m.id ? null : m.id)} aria-pressed={moods[today] === m.id} aria-label={FACE[m.id]}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill={m.color} /><circle cx="11.5" cy="13" r="1.8" fill="#202124" /><circle cx="20.5" cy="13" r="1.8" fill="#202124" /><path d={MOUTH[m.id]} fill="none" stroke="#202124" strokeWidth="2" strokeLinecap="round" /></svg>
          <span>{FACE[m.id]}</span>
        </button>
      ))}
    </div>
  )
  if (size === 'M') {
    const start = addDays(weekStart(today), -7)
    const days = Array.from({ length: 14 }, (_, i) => addDays(start, i))
    return (
      <div className="mood-m2">
        <div className="mood-today">
          <span className="mood-lab">Hoy</span>
          <div className="mood-faces">
            {MOODS.map((m) => (
              <button key={m.id} className={`mood-face-btn ${moods[today] === m.id ? 'on' : ''}`} onClick={() => set(today, moods[today] === m.id ? null : m.id)} aria-pressed={moods[today] === m.id} aria-label={FACE[m.id]}>
                <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill={m.color} /><circle cx="11.5" cy="13" r="1.8" fill="#202124" /><circle cx="20.5" cy="13" r="1.8" fill="#202124" /><path d={MOUTH[m.id]} fill="none" stroke="#202124" strokeWidth="2" strokeLinecap="round" /></svg>
                <span>{FACE[m.id]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mood-2w">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((l) => <span key={l} className="mood-2w-h">{l}</span>)}
          {days.map((d) => (
            <button key={d} className={`mood-2w-d ${d === today ? 'today' : ''} ${d > today ? 'fut' : ''}`} disabled={d > today}
              style={moods[d] ? { background: colorOf(moods[d]) } : undefined} onClick={() => cycle(d)} aria-label={d}>{Number(d.slice(8))}</button>
          ))}
        </div>
      </div>
    )
  }
  // L (y T): como Hábitos. Caras para hoy; Semana / Mes con fechas pintadas del color del ánimo; Análisis aparte
  const paint = (d) => (moods[d] ? colorOf(moods[d]) : undefined)
  const view = size === 'T' ? 'mes' : range
  return (
    <>
      {size === 'L' && (
        <div className="mood-bar mood-bar-l">
          {faces}
          <span className="fd-grow" />
          <Chips options={RANGES} value={analysis ? null : range} onChange={(v) => { setRange(v); setAnalysis(false) }} small />
          <button className={`chip ${analysis ? 'chip-on' : ''}`} onClick={() => setAnalysis(!analysis)} aria-pressed={analysis}><Icon name="chart" size={14} /> Análisis</button>
        </div>
      )}
      {size === 'T' && <div className="mood-bar mood-bar-t">{faces}</div>}
      <div className="slide-in fill hv-fill" key={view + analysis}>
        {analysis && size === 'L' ? <MoodAnalysis moods={moods} wide /> : (view === 'año' ? <YearCalendar since={since} today={today} paint={paint} /> : <DayCalendar mode={view} since={since} today={today} paint={paint} onTap={cycle} />)}
      </div>
    </>
  )
}
