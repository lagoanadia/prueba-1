import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { addDays, formatShort, todayISO } from '../lib/dates.js'
import { locale } from '../i18n/index.js'

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}` // m: 0-11

/**
 * Selector de fecha con la estética de <Select>: un botón que abre una tarjeta redondeada con el mes.
 * Mismo manejo: ratón, dedo o teclado (flechas mueven el día, Av/Re Pág el mes, Enter elige, Esc cierra).
 * value: "2026-11-24" o ''. onChange recibe "YYYY-MM-DD" (o '' si se borra).
 */
export default function DatePicker({ value, onChange, label = 'Fecha', min, className = '', style, placeholder = 'Fecha', color = '#3185FC' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [month, setMonth] = useState(() => (value || todayISO()).slice(0, 7)) // "2026-11": mes que se está viendo
  const [hi, setHi] = useState(value || todayISO()) // día resaltado con el teclado
  const btn = useRef(null)
  const pop = useRef(null)
  const today = todayISO()

  const place = () => {
    const r = btn.current.getBoundingClientRect()
    const w = 292
    const h = 340
    const below = window.innerHeight - r.bottom
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), width: w, ...(below < h + 12 && r.top > below ? { bottom: window.innerHeight - r.top + 6 } : { top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - h - 8)) }) })
  }
  const show = () => { const base = value || today; setMonth(base.slice(0, 7)); setHi(base); place(); setOpen(true) }
  const pick = (v) => { setOpen(false); if (v !== value) onChange(v); btn.current?.focus() }

  useLayoutEffect(() => { if (open) pop.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false) }
    const away = (e) => { if (!pop.current?.contains(e.target)) setOpen(false) } // al hacer scroll fuera de la tarjeta, se cierra
    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', away)
    window.addEventListener('scroll', away, true)
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('resize', away); window.removeEventListener('scroll', away, true) }
  }, [open])

  const [y, m] = month.split('-').map(Number)
  const shiftMonth = (n) => { const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`) }
  // Casillas del mes (semana en lunes); los huecos de antes/después son días de los meses vecinos, apagados
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const days = Array.from({ length: 42 }, (_, i) => addDays(iso(y, m - 1, 1), i - first))
  const monthName = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' })) // 1 ene 2024 fue lunes
  const blocked = (d) => Boolean(min && d < min)

  const moveHi = (n) => { const next = addDays(hi, n); setHi(next); setMonth(next.slice(0, 7)) }
  const onKey = (e) => {
    if (!open) { if (['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show() } return }
    const keys = { ArrowLeft: () => moveHi(-1), ArrowRight: () => moveHi(1), ArrowUp: () => moveHi(-7), ArrowDown: () => moveHi(7), PageUp: () => shiftMonth(-1), PageDown: () => shiftMonth(1) }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus() }
    else if (keys[e.key]) { e.preventDefault(); keys[e.key]() }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!blocked(hi)) pick(hi) }
  }

  return (
    <>
      <button ref={btn} type="button" className={`sel dp ${open ? 'is-open' : ''} ${value ? '' : 'is-empty'} ${className}`} style={{ '--c': color, ...style }}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey} aria-haspopup="dialog" aria-expanded={open} aria-label={label}>
        <Icon name="calendario" size={16} />
        <span className="sel-value">{value ? formatShort(value) : placeholder}</span>
      </button>
      {open && pos && createPortal(
        <div ref={pop} className="dp-pop" role="dialog" aria-label={label} tabIndex={-1} style={{ ...pos, '--c': color }} onKeyDown={onKey}>
          <div className="dp-head">
            <b className="dp-month">{monthName}</b>
            <button type="button" className="dp-nav" onClick={() => shiftMonth(-1)} aria-label="Mes anterior"><Icon name="left" size={16} strokeWidth={2.4} /></button>
            <button type="button" className="dp-nav" onClick={() => shiftMonth(1)} aria-label="Mes siguiente"><Icon name="right" size={16} strokeWidth={2.4} /></button>
          </div>
          <div className="dp-grid" role="grid">
            {weekdays.map((w, i) => <span key={i} className="dp-wd" aria-hidden="true">{w}</span>)}
            {days.map((d) => (
              <button type="button" key={d} role="gridcell" disabled={blocked(d)} aria-selected={d === value} aria-label={formatShort(d)}
                className={`dp-day ${d.slice(0, 7) !== month ? 'is-out' : ''} ${d === today ? 'is-today' : ''} ${d === value ? 'is-sel' : ''} ${d === hi ? 'is-hi' : ''}`}
                onPointerEnter={() => setHi(d)} onClick={() => pick(d)}>{Number(d.slice(8))}</button>
            ))}
          </div>
          <div className="dp-foot">
            <button type="button" onClick={() => pick('')} disabled={!value}>Borrar</button>
            <button type="button" onClick={() => pick(today)} disabled={blocked(today)}>Hoy</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
