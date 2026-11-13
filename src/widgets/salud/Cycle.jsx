import { useState } from 'react'
import { addDays, daysUntil, todayISO } from '../../lib/dates.js'

const SYMPTOMS = ['Dolor', 'Cansancio', 'Hinchazón', 'Ánimo bajo', 'Dolor de cabeza', 'Antojos']
const PERIOD = 5

const phaseOf = (n, len) => (n <= PERIOD ? 'menstrual' : n < len / 2 - 1 ? 'folicular' : n <= len / 2 + 1 ? 'ovulación' : 'lútea')
const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')

/** Ciclo menstrual: registras cuándo empieza el periodo y calcula el día del ciclo y el próximo periodo (orientativo). */
export default function Cycle({ data, update }) {
  const today = todayISO()
  const starts = [...(data.cycle?.starts ?? [])].sort()
  const last = starts.at(-1)
  const gaps = starts.slice(1).map((d, i) => daysUntil(d, starts[i])) // días entre inicios
  const len = gaps.length ? Math.min(40, Math.max(21, Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length))) : (data.cycle?.length ?? 28)
  const day = last ? daysUntil(today, last) + 1 : 0
  const next = last ? addDays(last, len) : null
  const [sym, setSym] = useState(false)
  const todays = data.cycleSymptoms?.[today] ?? []

  // Días del periodo: los 5 primeros desde cada inicio, salvo los que quitas tú; y los que añades tú. Se cambian tocando el cuadrado.
  const off = new Set(data.cycle?.off ?? [])
  const on = new Set(data.cycle?.on ?? [])
  const isPeriod = (i) => { const date = addDays(last, i); return (i < PERIOD && !off.has(date)) || on.has(date) }
  const flip = (i) => update((d) => {
    const date = addDays(last, i)
    const c = d.cycle ?? {}
    const offs = new Set(c.off ?? [])
    const ons = new Set(c.on ?? [])
    if (isPeriod(i)) {
      if (i === 0) return { ...d, cycle: { ...c, starts: (c.starts ?? []).filter((x) => x !== last), off: [...offs].filter((x) => x !== date), on: [...ons].filter((x) => x !== date) } } // el día 1 = deshacer el inicio (por si fue un toque sin querer)
      ons.delete(date); offs.add(date)
    } else { offs.delete(date); ons.add(date) }
    return { ...d, cycle: { ...c, off: [...offs], on: [...ons] } }
  })
  const startNow = () => update((d) => ({ ...d, cycle: { ...(d.cycle ?? {}), length: len, starts: [...new Set([...(d.cycle?.starts ?? []), today])] } }))
  const toggle = (s) => update((d) => { const cur = d.cycleSymptoms?.[today] ?? []; return { ...d, cycleSymptoms: { ...(d.cycleSymptoms ?? {}), [today]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] } } })

  return (
    <div className="sa-cycle">
      {last ? (
        <>
          <div className="sa-row sa-split">
            <div><span className="sa-label">Hoy</span><b className="sa-big">Día {day}<small> de {len}</small></b></div>
            <div><span className="sa-label">Próximo periodo</span><b className="sa-big">{fmt(next)}<small> {daysUntil(next) >= 0 ? `en ${daysUntil(next)} días` : `hace ${-daysUntil(next)} días`}</small></b></div>
          </div>
          <div className="sa-days" style={{ '--n': len }} aria-label={`Día ${day} del ciclo`}>
            {Array.from({ length: len }, (_, i) => (
              <button type="button" key={i} className={`${isPeriod(i) ? 'is-period' : ''} ${i + 1 === day ? 'is-now' : ''}`} onClick={() => flip(i)} aria-pressed={isPeriod(i)}
                aria-label={`Día ${i + 1}, ${fmt(addDays(last, i))}: ${isPeriod(i) ? 'periodo (toca para quitarlo)' : 'sin periodo (toca para marcarlo)'}`} title={isPeriod(i) ? 'Quitar de periodo' : 'Marcar como periodo'} />
            ))}
          </div>
          <div className="sa-legend"><span><i className="is-period" />Periodo</span><span><i />Resto del ciclo</span><span className="sa-hint">Toca un cuadrado para marcar o quitar el periodo</span>{day > 0 && day <= len && <span>Fase actual: {phaseOf(day, len)}</span>}</div>
        </>
      ) : <p className="sa-hint">Registra el primer día de tu periodo y calcularé el día del ciclo y el próximo periodo.</p>}
      <div className="sa-row">
        <button className="sa-btn" onClick={startNow} disabled={last === today}>Registrar inicio</button>
        <button className={`sa-btn is-soft ${sym ? 'on' : ''}`} onClick={() => setSym(!sym)} aria-expanded={sym}>Anotar síntomas</button>
      </div>
      {sym && <div className="sa-chips">{SYMPTOMS.map((s) => <button key={s} className={`sa-chip ${todays.includes(s) ? 'on' : ''}`} onClick={() => toggle(s)} aria-pressed={todays.includes(s)}>{s}</button>)}</div>}
    </div>
  )
}
