import { useState } from 'react'
import { fromMin, toMin } from './healthUtils.js'

const CYCLE = 90 // minutos por ciclo de sueño
const FALL_ASLEEP = 15 // lo que tardas en dormirte

/** Calculadora de sueño: dices a qué hora quieres despertarte y te propone a qué hora acostarte (ciclos de 90 min). */
export default function SleepCalc({ data, update }) {
  const [wake, setWake] = useState(data.sleepCalc?.wake ?? '07:30')
  const [shown, setShown] = useState(Boolean(data.sleepCalc?.wake))
  const calc = (e) => { e.preventDefault(); update((d) => ({ ...d, sleepCalc: { wake } })); setShown(true) }
  const opts = [6, 5, 4].map((n) => ({ n, at: fromMin(toMin(wake) - n * CYCLE - FALL_ASLEEP), hours: (n * CYCLE) / 60 }))

  return (
    <div className="sa-sleepcalc">
      <form className="sa-row" onSubmit={calc}>
        <span className="sa-label">Quiero despertarme a las</span>
        <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} aria-label="Hora de despertarme" />
        <button className="sa-btn">Calcular</button>
      </form>
      {shown && (
        <>
          <span className="sa-label">Acuéstate a las</span>
          <div className="sa-cards">
            {opts.map((o) => (
              <div key={o.n} className={`sa-card ${o.n === 5 ? 'is-rec' : ''}`}>
                <small>{o.n} ciclos{o.n === 5 ? ' · recomendado' : ''}</small>
                <b>{o.at}</b>
                <span>{String(o.hours).replace('.', ',')} h de sueño</span>
              </div>
            ))}
          </div>
          <p className="sa-hint">Cada ciclo dura 90 minutos y se cuentan 15 minutos para dormirte.</p>
        </>
      )}
    </div>
  )
}
