import { useState } from 'react'
import { todayISO, weekDays } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'
import { doneEntries, fmtHM } from './healthUtils.js'

/**
 * Entrenamientos: una rueda con el tiempo de cada deporte en la semana o en el mes y, en el centro, el que más has practicado.
 * Todo sale del plan de «Ejercicio de la semana»: cuentan las sesiones marcadas como hechas (a mano o solas al pasar su hora).
 * T: la rueda y los nombres · M: la rueda y los tres primeros · L: rueda, semana/mes, todos los deportes en tres columnas (deporte, tiempo, %) y el total.
 */
// Colores apagados (los tonos suaves de las asignaturas de Estudios)
const tone = (c) => `color-mix(in srgb, ${c} 66%, #FFFFFF)`

export default function Workouts({ size, data }) {
  const today = todayISO()
  const sports = sportsOf(data)
  const [range, setRange] = useState('week') // 'week' | 'month'
  const week = weekDays(today)
  const inRange = (date) => (range === 'week' ? week.includes(date) : date.slice(0, 7) === today.slice(0, 7))

  // Las sesiones del plan se dan por hechas solas al pasar su hora: no hay que apuntar nada
  const by = new Map()
  const entries = doneEntries(data, today, weekDays).filter((x) => inRange(x.date))
  entries.forEach((x) => { const e = by.get(x.sport) ?? { sport: x.sport, min: 0 }; e.min += x.min; by.set(x.sport, e) })
  const ranking = [...by.values()].sort((a, b) => b.min - a.min)
  const total = ranking.reduce((n, r) => n + r.min, 0)
  let acc = 0
  const stops = ranking.map((r) => { const a = (acc / total) * 360; acc += r.min; return `${tone(colorOf(sports, r.sport))} ${a}deg ${(acc / total) * 360}deg` }).join(', ')
  const rangeName = range === 'week' ? 'esta semana' : 'este mes'

  const donut = (
    <div className="wo-donut" style={{ background: ranking.length ? `conic-gradient(${stops})` : 'var(--soft)' }}>
      <div className="wo-hole">
        {ranking.length
          ? <><span>Más practicado</span><b title={ranking[0].sport} style={{ color: colorOf(sports, ranking[0].sport) }}>{ranking[0].sport}</b></>
          : <span>Aún no hay entrenos {rangeName}</span>}
      </div>
    </div>
  )
  // Todos los deportes y el cambio semana/mes están en cualquier tamaño (en los pequeños, la lista se desplaza)
  const wide = size !== 'T'
  const legend = ranking.length > 0 && (
    <ul className="wo-legend">
      {ranking.map((r) => (
        <li key={r.sport}>
          <i style={{ background: tone(colorOf(sports, r.sport)) }} />
          <span className="wo-name" title={r.sport}>{r.sport}</span>
          {wide && <em>{fmtHM(r.min)}</em>}
          <b>{Math.round((r.min / total) * 100)}%</b>
        </li>
      ))}
    </ul>
  )
  const toggle = (
    <div className="wk-range" role="group" aria-label="Periodo">
      <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')} aria-pressed={range === 'week'}>Semana</button>
      <button className={range === 'month' ? 'on' : ''} onClick={() => setRange('month')} aria-pressed={range === 'month'}>Mes</button>
    </div>
  )

  if (size === 'T') return <div className="wo wo-T">{donut}{toggle}{legend}</div>
  if (size === 'M') return <div className="wo wo-M">{donut}<div className="wo-side">{toggle}{legend}</div></div>
  return (
    <div className="wo wo-L">
      {donut}
      <div className="wo-side">
        {toggle}
        {legend}
        {ranking.length > 0 && <div className="wo-total"><span>Total {range === 'week' ? 'de la semana' : 'del mes'}</span><b>{fmtHM(total)}</b><small>{entries.length} {entries.length === 1 ? 'sesión' : 'sesiones'}</small></div>}
      </div>
    </div>
  )
}
