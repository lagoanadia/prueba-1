import { useState } from 'react'
import { addDays, weekStart } from '../../lib/dates.js'
import { locale } from '../../i18n/index.js'
import { habitStatus } from './habitKinds.js'

const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const chevron = (d) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const Nav = ({ label, onPrev, onNext, canPrev, canNext }) => (
  <div className="hv-nav">
    <button onClick={onPrev} disabled={!canPrev} aria-label="Anterior">{chevron('M15 5L8 12L15 19')}</button>
    <b>{label}</b>
    <button onClick={onNext} disabled={!canNext} aria-label="Siguiente">{chevron('M9 5L16 12L9 19')}</button>
  </div>
)
const monthName = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }).replace('.', '')

/**
 * Semana con fechas: una fila por hábito (o solo el elegido) y una columna por día.
 * Tocar una casilla marca o desmarca. Solo se puede ir hacia atrás hasta la semana en que empezaste.
 */
export function HabitWeek({ list, pixels, since, today, onToggle }) {
  const [start, setStart] = useState(() => weekStart(today))
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const off = (d) => d < since || d > today
  return (
    <div className="hv">
      <Nav label={`${shortDate(days[0])} – ${shortDate(days[6])}`} onPrev={() => setStart(addDays(start, -7))} onNext={() => setStart(addDays(start, 7))} canPrev={start > since} canNext={days[6] < today} />
      <div className="hv-week" style={{ '--rows': list.length }}>
        <span />
        {days.map((d, i) => <span key={d} className={`hv-day ${d === today ? 'today' : ''}`}>{LETTERS[i]}<b>{Number(d.slice(8))}</b></span>)}
        <span />
        {list.map((h) => {
          const marked = pixels[h.id] ?? []
          return [
            <span key={h.id + 'n'} className="hv-name"><i style={{ background: h.color }} />{h.name}</span>,
            ...days.map((d) => (
              <button key={h.id + d} className={`hv-cell ${d === today && !marked.includes(d) ? 'today' : ''}`} disabled={off(d)}
                style={marked.includes(d) ? { background: h.color } : undefined} onClick={() => onToggle(h.id, d)}
                aria-label={`${h.name}, ${d}`} aria-pressed={marked.includes(d)} />
            )),
            <span key={h.id + 's'} className="hv-streak">{habitStatus(h, marked, today)}</span>,
          ]
        })}
      </div>
    </div>
  )
}

/**
 * Mes como un calendario con el número de cada día. Con un hábito, el día se pinta de su color (y se marca tocándolo);
 * con todos, cada hábito cumplido es un puntito de su color. Antes de tu primer día y después de hoy, en gris.
 */
export function HabitMonth({ list, pixels, since, today, onToggle }) {
  const [month, setMonth] = useState(() => today.slice(0, 7) + '-01')
  const first = month
  const lead = (new Date(`${first}T12:00:00`).getDay() + 6) % 7
  const next = (() => { const d = new Date(`${first}T12:00:00`); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10).slice(0, 7) + '-01' })()
  const prev = (() => { const d = new Date(`${first}T12:00:00`); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10).slice(0, 7) + '-01' })()
  const count = Math.round((new Date(`${next}T12:00:00`) - new Date(`${first}T12:00:00`)) / 864e5)
  const days = Array.from({ length: count }, (_, i) => addDays(first, i))
  const one = list.length === 1 ? list[0] : null
  return (
    <div className="hv">
      <Nav label={monthName(first)} onPrev={() => setMonth(prev)} onNext={() => setMonth(next)} canPrev={first > since} canNext={next <= today} />
      <div className="hv-month" style={{ '--weeks': Math.ceil((lead + count) / 7) }}>
        {LETTERS.map((l) => <span key={l} className="hv-mhead">{l}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
        {days.map((d) => {
          const off = d < since || d > today
          const done = list.filter((h) => (pixels[h.id] ?? []).includes(d))
          const fill = one && done.length ? one.color : undefined
          return (
            <button key={d} className={`hv-mday ${off ? 'off' : ''} ${d === today ? 'today' : ''} ${fill ? 'full' : ''}`} disabled={off || !one}
              style={fill ? { background: fill } : undefined} onClick={() => one && onToggle(one.id, d)} aria-label={d}>
              <span>{Number(d.slice(8))}</span>
              {!one && done.length > 0 && <span className="hv-dots">{done.map((h) => <i key={h.id} style={{ background: h.color }} />)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Calendario de un solo dato por día (p. ej. el ánimo): cada día se pinta del color que devuelve `paint`.
 * Semana o mes con flechas; no se puede ir antes de tu primer día y los días futuros no se tocan.
 */
export function DayCalendar({ mode, since, today, paint, onTap }) {
  const [anchor, setAnchor] = useState(today)
  const week = mode === 'semana'
  const first = week ? weekStart(anchor) : anchor.slice(0, 7) + '-01'
  const shift = (n) => {
    if (week) return setAnchor(addDays(first, n * 7))
    const d = new Date(`${first}T12:00:00`); d.setMonth(d.getMonth() + n); setAnchor(d.toISOString().slice(0, 7) + '-01')
  }
  const next = (() => { if (week) return addDays(first, 7); const d = new Date(`${first}T12:00:00`); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 7) + '-01' })()
  const count = Math.round((new Date(`${next}T12:00:00`) - new Date(`${first}T12:00:00`)) / 864e5)
  const days = Array.from({ length: count }, (_, i) => addDays(first, i))
  const lead = week ? 0 : (new Date(`${first}T12:00:00`).getDay() + 6) % 7
  const label = week ? `${shortDate(days[0])} – ${shortDate(days[6])}` : monthName(first)
  return (
    <div className="hv">
      <Nav label={label} onPrev={() => shift(-1)} onNext={() => shift(1)} canPrev={first > since} canNext={next <= today} />
      <div className={`hv-month ${week ? 'hv-month-week' : ''}`} style={{ '--weeks': Math.ceil((lead + count) / 7) }}>
        {LETTERS.map((l) => <span key={l} className="hv-mhead">{l}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
        {days.map((d) => {
          const off = d < since || d > today
          const fill = !off ? paint(d) : undefined
          return (
            <button key={d} className={`hv-mday ${off ? 'off' : ''} ${d > today ? 'fut' : ''} ${d === today ? 'today' : ''} ${fill ? 'full' : ''}`} disabled={off || !onTap}
              style={fill ? { background: fill } : undefined} onClick={() => onTap?.(d)} aria-label={d}>
              <span>{Number(d.slice(8))}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
/**
 * Año: los 12 meses en mini calendario. Cada día se pinta con `paint` (como Semana / Mes);
 * antes de tu primer día y después de hoy, en gris claro. El mes actual va remarcado.
 */
export function YearCalendar({ since, today, paint }) {
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const sinceYear = Number(since.slice(0, 4))
  const thisYear = Number(today.slice(0, 4))
  return (
    <div className="hv">
      <Nav label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} canPrev={year > sinceYear} canNext={year < thisYear} />
      <div className="hv-year">
        {MONTH_SHORT.map((name, mi) => {
          const first = `${year}-${String(mi + 1).padStart(2, '0')}-01`
          const lead = (new Date(`${first}T12:00:00`).getDay() + 6) % 7
          const count = new Date(year, mi + 1, 0).getDate()
          const off = `${year}-${String(mi + 1).padStart(2, '0')}-${count}` < since || first > today
          return (
            <div key={name} className={`hv-ym ${off ? 'off' : ''} ${today.slice(0, 7) === first.slice(0, 7) ? 'cur' : ''}`}>
              <span>{name}</span>
              <div className="hv-ym-grid">
                {Array.from({ length: lead }, (_, i) => <i key={'e' + i} className="pad" />)}
                {Array.from({ length: count }, (_, i) => {
                  const d = addDays(first, i)
                  const fill = d >= since && d <= today ? paint(d) : undefined
                  return <i key={d} className={d < since || d > today ? 'off' : ''} style={fill ? { background: fill } : undefined} title={d} />
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
