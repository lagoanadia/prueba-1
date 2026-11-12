import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { todayISO } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const BOTH = '#1FA463'
const SPORT = '#8EDCB0'
const STEPS = '#F5C84B'

/**
 * Constancia: el mes con su forma de calendario, en cuadraditos. Un día cuenta si has hecho deporte o has llegado a tu objetivo de pasos:
 * verde fuerte si las dos cosas, verde claro solo deporte, amarillo solo pasos. Los filtros enseñan solo pasos o un deporte concreto.
 */
export default function Consistency({ data }) {
  const [shift, setShift] = useState(0)
  const [filter, setFilter] = useState('all') // 'all' | 'steps' | nombre de un deporte
  const today = todayISO()
  const [y0, m0] = today.split('-').map(Number)
  const m = ((m0 - 1 + shift) % 12 + 12) % 12
  const y = y0 + Math.floor((m0 - 1 + shift) / 12)
  const n = new Date(y, m + 1, 0).getDate()
  const lead = (new Date(y, m, 1).getDay() + 6) % 7 // huecos antes del día 1 (la semana empieza en lunes)
  const iso = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const sports = sportsOf(data)
  const goal = data.stepsGoal ?? 8000
  const workouts = data.workouts ?? []
  const did = (date) => workouts.some((w) => w.date === date && (filter === 'all' || filter === 'steps' || w.sport === filter))
  const walked = (date) => (data.steps?.[date] ?? 0) >= goal
  const state = (d) => {
    const date = iso(d)
    const sp = filter === 'steps' ? false : did(date)
    const st = filter === 'all' || filter === 'steps' ? walked(date) : false
    return sp && st ? 'both' : sp ? 'sport' : st ? 'steps' : 'none'
  }
  const days = Array.from({ length: n }, (_, i) => i + 1)
  const elapsed = days.filter((d) => iso(d) <= today)
  const met = elapsed.filter((d) => state(d) !== 'none').length
  const colors = { both: BOTH, sport: filter !== 'all' && filter !== 'steps' ? colorOf(sports, filter) : SPORT, steps: STEPS, none: 'var(--soft)' }

  return (
    <div className="sa-consist">
      <div className="cs-filters" role="group" aria-label="Qué contar">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>Todo</button>
        <button className={filter === 'steps' ? 'on' : ''} onClick={() => setFilter('steps')} aria-pressed={filter === 'steps'}>Pasos</button>
        {sports.map((sp) => <button key={sp} className={filter === sp ? 'on' : ''} onClick={() => setFilter(sp)} aria-pressed={filter === sp}><i style={{ background: colorOf(sports, sp) }} />{sp}</button>)}
      </div>
      <div className="cs-month">
        {WEEK.map((d) => <span key={d} className="cs-wd">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <i key={`l${i}`} />)}
        {days.map((d) => {
          const s = state(d)
          const future = iso(d) > today
          return <span key={d} className={`cs-day ${future ? 'is-future' : ''} ${iso(d) === today ? 'is-today' : ''}`} style={s !== 'none' ? { background: colors[s], color: s === 'both' || (filter !== 'all' && filter !== 'steps') ? '#fff' : '#5F6368' } : undefined} title={`${d} de ${MONTHS[m]}`}>{d}</span>
        })}
      </div>
      <div className="sa-legend">
        {filter === 'all' && <><span><i style={{ background: BOTH }} />Deporte y pasos</span><span><i style={{ background: SPORT }} />Solo deporte</span><span><i style={{ background: STEPS }} />Solo pasos</span></>}
        {filter === 'steps' && <span><i style={{ background: BOTH }} />Objetivo de pasos cumplido</span>}
        {filter !== 'all' && filter !== 'steps' && <span><i style={{ background: colorOf(sports, filter) }} />Día con {filter}</span>}
        <b>{met} de {elapsed.length} días</b>
      </div>
      <div className="sa-row sa-center">
        <button className="fd-ib" onClick={() => setShift(shift - 1)} aria-label="Mes anterior"><Icon name="left" size={16} /></button>
        <b>{MONTHS[m]} {y}</b>
        <button className="fd-ib" onClick={() => setShift(shift + 1)} disabled={shift >= 0} aria-label="Mes siguiente"><Icon name="right" size={16} /></button>
      </div>
    </div>
  )
}
