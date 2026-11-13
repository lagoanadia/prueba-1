import History from '../../components/History.jsx'
import { addDays, daysUntil, formatShort, todayISO } from '../../lib/dates.js'

const SYMPTOMS = ['Dolor', 'Cansancio', 'Hinchazón', 'Ánimo bajo', 'Dolor de cabeza', 'Antojos']
const PERIOD = 5
const PHASE_COLORS = { menstrual: '#E58BD7', folicular: '#F6C9EE', ovulación: '#B9A4F5', lútea: '#F9DDFF' }

const phaseOf = (n, len) => (n <= PERIOD ? 'menstrual' : n < len / 2 - 1 ? 'folicular' : n <= len / 2 + 1 ? 'ovulación' : 'lútea')
const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')

/** Anillo del ciclo: un arco por fase y una marca en el día de hoy. El texto de dentro es pequeño para que respire. */
function Ring({ len, day, phase }) {
  const R = 44
  const C = 2 * Math.PI * R
  // Días de cada fase seguidos, para dibujar un arco por fase
  const runs = []
  for (let n = 1; n <= len; n++) { const p = phaseOf(n, len); if (runs.at(-1)?.p === p) runs.at(-1).n++; else runs.push({ p, n: 1 }) }
  let acc = 0
  const a = ((Math.min(Math.max(day, 1), len) - 0.5) / len) * 2 * Math.PI - Math.PI / 2
  return (
    <div className="cy-ring" role="img" aria-label={`Día ${day} de ${len}, fase ${phase}`}>
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <g transform="rotate(-90 55 55)" fill="none" strokeWidth="10">
          {runs.map((r, i) => { const el = <circle key={i} cx="55" cy="55" r={R} stroke={PHASE_COLORS[r.p]} strokeDasharray={`${(r.n / len) * C - 1.6} ${C}`} strokeDashoffset={-(acc / len) * C} />; acc += r.n; return el })}
        </g>
        {day > 0 && day <= len && <circle cx={55 + R * Math.cos(a)} cy={55 + R * Math.sin(a)} r="6" fill="#fff" stroke="#202124" strokeWidth="2.6" />}
      </svg>
      <div className="cy-ring-in"><b>Día {day}</b><span>de {len} días</span><span className="cy-phase">{phase}</span></div>
    </div>
  )
}

/**
 * Ciclo menstrual: registras cuándo empieza el periodo y calcula el día del ciclo y el próximo periodo (orientativo).
 * M: lo esencial en una fila. L: anillo con las fases, próximo periodo, síntomas de hoy y los días del ciclo (los ciclos pasados, en el reloj).
 * Los cuadraditos se tocan para marcar o quitar el periodo de ese día (el día 1 deshace el inicio, por si fue un toque sin querer).
 */
export default function Cycle({ size, data, update }) {
  const today = todayISO()
  const starts = [...(data.cycle?.starts ?? [])].sort()
  const last = starts.at(-1)
  const gaps = starts.slice(1).map((d, i) => daysUntil(d, starts[i])) // días entre inicios
  const len = gaps.length ? Math.min(40, Math.max(21, Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length))) : (data.cycle?.length ?? 28)
  const day = last ? daysUntil(today, last) + 1 : 0
  const next = last ? addDays(last, len) : null
  const todays = data.cycleSymptoms?.[today] ?? []
  const phase = day > 0 && day <= len ? phaseOf(day, len) : ''

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
      if (i === 0) return { ...d, cycle: { ...c, starts: (c.starts ?? []).filter((x) => x !== last), off: [...offs].filter((x) => x !== date), on: [...ons].filter((x) => x !== date) } } // el día 1 = deshacer el inicio
      ons.delete(date); offs.add(date)
    } else { offs.delete(date); ons.add(date) }
    return { ...d, cycle: { ...c, off: [...offs], on: [...ons] } }
  })
  const startNow = () => update((d) => ({ ...d, cycle: { ...(d.cycle ?? {}), length: len, starts: [...new Set([...(d.cycle?.starts ?? []), today])] } }))
  const toggle = (s) => update((d) => { const cur = d.cycleSymptoms?.[today] ?? []; return { ...d, cycleSymptoms: { ...(d.cycleSymptoms ?? {}), [today]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] } } })

  // Lo que ya pasó, en el reloj: los ciclos anteriores y cuánto duró cada uno
  const past = starts.slice(0, -1).map((s, i) => ({ id: s, date: formatShort(s), text: `Ciclo de ${daysUntil(starts[i + 1], s)} días` })).reverse()
  const history = <History title="Ciclos anteriores" empty="Aún no hay ciclos anteriores" items={past} />

  const strip = last && (
    <div className="sa-days" style={{ '--n': len }} role="group" aria-label={`Días del ciclo: toca uno para marcar o quitar el periodo`}>
      {Array.from({ length: len }, (_, i) => (
        <button type="button" key={i} className={`${isPeriod(i) ? 'is-period' : ''} ${i + 1 === day ? 'is-now' : ''}`} onClick={() => flip(i)} aria-pressed={isPeriod(i)}
          aria-label={`Día ${i + 1}, ${fmt(addDays(last, i))}: ${isPeriod(i) ? 'periodo' : 'sin periodo'}`} title={`${fmt(addDays(last, i))} · ${isPeriod(i) ? 'periodo (toca para quitarlo)' : 'toca para marcar periodo'}`} />
      ))}
    </div>
  )
  const startBtn = <button className="sa-btn" onClick={startNow} disabled={last === today}>Registrar inicio</button>

  if (!last) {
    return (
      <div className="sa-cycle">
        <p className="sa-hint">Registra el primer día de tu periodo y calcularé el día del ciclo y el próximo periodo.</p>
        <div className="sa-row">{startBtn}</div>
      </div>
    )
  }
  const nextText = daysUntil(next) >= 0 ? `en ${daysUntil(next)} días` : `hace ${-daysUntil(next)} días`

  if (size === 'M') {
    return (
      <div className="sa-cycle cy-M">
        <div className="cy-top">
          <div><b className="sa-big">Día {day}<small> de {len}</small></b>{phase && <span className="cy-chip">{phase}</span>}</div>
          <div className="cy-next"><span className="sa-label">Próximo periodo</span><b>{fmt(next)}<small> {nextText}</small></b></div>
        </div>
        <div className="cy-foot">{strip}{startBtn}</div>
      </div>
    )
  }

  return (
    <div className="sa-cycle cy-L">
      {history}
      <div className="cy-main">
        <Ring len={len} day={day} phase={phase} />
        <div className="cy-side">
          <div className="cy-tile"><span>Próximo periodo</span><b>{fmt(next)}</b><small>{nextText}</small></div>
          <span className="sa-label">Síntomas de hoy</span>
          <div className="sa-chips">{SYMPTOMS.map((s) => <button key={s} className={`sa-chip ${todays.includes(s) ? 'on' : ''}`} onClick={() => toggle(s)} aria-pressed={todays.includes(s)}>{s}</button>)}</div>
        </div>
      </div>
      <div className="cy-foot">{strip}<div className="sa-row">{startBtn}</div></div>
    </div>
  )
}
