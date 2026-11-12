import { useState } from 'react'
import { todayISO, weekDays } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'
import { doneEntries, fmtHM } from './healthUtils.js'

/**
 * Entrenamientos: una rueda con el tiempo de cada deporte en la semana o en el mes y, en el centro, el que más has practicado.
 * Todo sale del plan de «Ejercicio de la semana»: cuentan las sesiones marcadas como hechas (a mano o solas al pasar su hora).
 */
export default function Workouts({ data }) {
  const today = todayISO()
  const sports = sportsOf(data)
  const [range, setRange] = useState('week') // 'week' | 'month'
  const week = weekDays(today)
  const inRange = (date) => (range === 'week' ? week.includes(date) : date.slice(0, 7) === today.slice(0, 7))

  // Las sesiones del plan se dan por hechas solas al pasar su hora: no hay que apuntar nada
  const by = new Map()
  doneEntries(data, today, weekDays).filter((x) => inRange(x.date)).forEach((x) => { const e = by.get(x.sport) ?? { sport: x.sport, min: 0 }; e.min += x.min; by.set(x.sport, e) })
  const ranking = [...by.values()].sort((a, b) => b.min - a.min)
  const total = ranking.reduce((n, r) => n + r.min, 0)
  let acc = 0
  const stops = ranking.map((r) => { const a = (acc / total) * 360; acc += r.min; return `${colorOf(sports, r.sport)} ${a}deg ${(acc / total) * 360}deg` }).join(', ')

  return (
    <div className="wk-wheel">
      <div className="wk-range" role="group" aria-label="Periodo">
        <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')} aria-pressed={range === 'week'}>Semana</button>
        <button className={range === 'month' ? 'on' : ''} onClick={() => setRange('month')} aria-pressed={range === 'month'}>Mes</button>
      </div>
      <div className="wk-wheel-body">
        <div className="wk-donut" style={{ background: ranking.length ? `conic-gradient(${stops})` : 'var(--soft)' }}>
          <div className="wk-hole">
            {ranking.length
              ? <><span>Más practicado</span><b style={{ color: colorOf(sports, ranking[0].sport) }}>{ranking[0].sport}</b></>
              : <span>Aún no hay entrenos {range === 'week' ? 'esta semana' : 'este mes'}</span>}
          </div>
        </div>
        {ranking.length > 0 && (
          <ul className="wk-legend">
            {ranking.map((r, i) => <li key={r.sport} className={i === 0 ? 'is-top' : ''}><i style={{ background: colorOf(sports, r.sport) }} /><span className="w-ellipsis">{r.sport}</span><em>{fmtHM(r.min)}</em><b>{Math.round((r.min / total) * 100)}%</b></li>)}
          </ul>
        )}
      </div>
    </div>
  )
}
