import { useState } from 'react'
import Chips from '../Chips.jsx'
import { DayCalendar, YearCalendar } from '../journal/HabitViews.jsx'
import { todayISO, weekDays } from '../../lib/dates.js'
import { doneEntries } from './healthUtils.js'
import { colorOf, sportsOf } from './sports.js'

// Los colores de las asignaturas de Estudios: verde y amarillo de su paleta
const BOTH = 'color-mix(in srgb, #1FA463 72%, #FFFFFF)'
const SPORT = 'color-mix(in srgb, #1FA463 38%, #FFFFFF)'
const STEPS = 'color-mix(in srgb, #EAB308 62%, #FFFFFF)'

/**
 * Constancia: el mes con su forma de calendario, en cuadraditos. Un día cuenta si has hecho deporte o has llegado a tu objetivo de pasos:
 * verde fuerte si las dos cosas, verde claro solo deporte, amarillo solo pasos. Los filtros enseñan solo pasos o un deporte concreto.
 */
export default function Consistency({ data }) {
  const [range, setRange] = useState('mes')
  const [filter, setFilter] = useState('all') // 'all' | 'steps' | nombre de un deporte
  const today = todayISO()
  const [y, m0] = today.split('-').map(Number)
  const m = m0 - 1
  const n = new Date(y, m + 1, 0).getDate()
  const iso = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const sports = sportsOf(data)
  const goal = data.stepsGoal ?? 8000
  const workouts = doneEntries(data, today, weekDays, true) // lo del plan se da por hecho solo
  const did = (date) => workouts.some((w) => w.date === date && (filter === 'all' || filter === 'steps' || w.sport === filter))
  const walked = (date) => (data.steps?.[date] ?? 0) >= goal
  const stateOf = (date) => {
    const sp = filter === 'steps' ? false : did(date)
    const st = filter === 'all' || filter === 'steps' ? walked(date) : false
    return sp && st ? 'both' : sp ? 'sport' : st ? 'steps' : 'none'
  }
  const state = (d) => stateOf(iso(d))
  const days = Array.from({ length: n }, (_, i) => i + 1)
  const elapsed = days.filter((d) => iso(d) <= today)
  const met = elapsed.filter((d) => state(d) !== 'none').length
  const colors = { both: BOTH, sport: filter !== 'all' && filter !== 'steps' ? `color-mix(in srgb, ${colorOf(sports, filter)} 66%, #FFFFFF)` : SPORT, steps: STEPS, none: undefined }
  // Desde el primer día con algo apuntado (deporte o pasos): antes, en gris, como en el Mood tracker
  const firsts = [...workouts.map((w) => w.date), ...Object.keys(data.steps ?? {})].filter(Boolean).sort()
  const since = data.since ?? (firsts[0] && firsts[0] < today ? firsts[0] : today)

  // Como el Mood tracker: filtros y Semana / Mes arriba, calendario con fechas pintadas y la leyenda abajo
  return (
    <div className="sa-consist sa-consist-v2">
      <div className="mood-bar">
        <div className="cs-filters" role="group" aria-label="Qué contar">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>Todo</button>
          <button className={filter === 'steps' ? 'on' : ''} onClick={() => setFilter('steps')} aria-pressed={filter === 'steps'}>Pasos</button>
          {sports.map((sp) => <button key={sp} className={filter === sp ? 'on' : ''} onClick={() => setFilter(sp)} aria-pressed={filter === sp}><i style={{ background: colorOf(sports, sp) }} />{sp}</button>)}
        </div>
        <span className="fd-grow" />
        <Chips options={[{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }, { id: 'año', label: 'Año' }]} value={range} onChange={setRange} small />
      </div>
      <div className="slide-in fill hv-fill" key={range + filter}>
        {range === 'año' ? <YearCalendar since={since} today={today} paint={(d) => colors[stateOf(d)]} /> : <DayCalendar mode={range} since={since} today={today} paint={(d) => colors[stateOf(d)]} />}
      </div>
      <div className="sa-legend">
        {filter === 'all' && <><span><i style={{ background: BOTH }} />Deporte y pasos</span><span><i style={{ background: SPORT }} />Solo deporte</span><span><i style={{ background: STEPS }} />Solo pasos</span></>}
        {filter === 'steps' && <span><i style={{ background: BOTH }} />Objetivo de pasos cumplido</span>}
        {filter !== 'all' && filter !== 'steps' && <span><i style={{ background: colorOf(sports, filter) }} />Día con {filter}</span>}
        {range !== 'año' && <b>{met} de {elapsed.length} días este mes</b>}
      </div>
    </div>
  )
}
