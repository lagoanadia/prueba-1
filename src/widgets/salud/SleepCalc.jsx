import { useState } from 'react'
import { fmtHM, fromMin, toMin } from './healthUtils.js'

const CYCLE = 90 // minutos por ciclo de sueño
const FALL_ASLEEP = 15 // lo que tardas en dormirte

/**
 * Calculadora de sueño: dices a qué hora quieres despertarte y te propone a qué hora acostarte (ciclos de 90 min).
 * M: la hora y las tres propuestas. L: además, la noche recomendada dibujada (15 min para dormirte y los ciclos hasta que suena la alarma).
 */
export default function SleepCalc({ size, data, update }) {
  const [wake, setWake] = useState(data.sleepCalc?.wake ?? '07:30')
  const [shown, setShown] = useState(Boolean(data.sleepCalc?.wake))
  const calc = (e) => { e.preventDefault(); update((d) => ({ ...d, sleepCalc: { wake } })); setShown(true) }
  const opts = [6, 5, 4].map((n) => ({ n, at: fromMin(toMin(wake) - n * CYCLE - FALL_ASLEEP), min: n * CYCLE }))
  const rec = opts.find((o) => o.n === 5)

  return (
    <div className={`sa-sleepcalc sc-${size}`}>
      <form className="sa-row" onSubmit={calc}>
        <span className="sa-label">Quiero despertarme a las</span>
        <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} aria-label="Hora de despertarme" />
        <button className="sa-btn">Calcular</button>
      </form>
      {shown && (
        <>
          {size === 'L' && (
            <div className="sc-night" role="img" aria-label={`Acuéstate a las ${rec.at}: ${fmtHM(rec.min)} de sueño hasta las ${wake}`}>
              <div className="sc-bar" title="15 minutos para dormirte y después 5 ciclos de 90 minutos">
                <i className="sc-fall" />
                {Array.from({ length: 5 }, (_, i) => <i key={i} />)}
              </div>
              <div className="sc-cap"><span>Te acuestas {rec.at}</span><b>{fmtHM(rec.min)} de sueño</b><span>Despiertas {wake}</span></div>
            </div>
          )}
          <div className="sa-cards">
            {opts.map((o) => (
              <div key={o.n} className={`sa-card ${o.n === 5 ? 'is-rec' : ''}`}>
                <small>{o.n} ciclos{o.n === 5 && size === 'L' ? ' · recomendado' : ''}</small>
                <b>{o.at}</b>
                {size === 'L' && <span>{String(o.min / 60).replace('.', ',')} h de sueño</span>}
              </div>
            ))}
          </div>
          {size === 'L' && <p className="sa-hint">Cada ciclo dura 90 minutos y se cuentan 15 minutos para dormirte.</p>}
        </>
      )}
    </div>
  )
}
