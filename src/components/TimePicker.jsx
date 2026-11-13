import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

const pad = (n) => String(n).padStart(2, '0')
/** "7:30", "730", "19.30", "7" → "07:30", "19:30", "07:00"; null si no es una hora. */
export function parseTime(t) {
  const s = String(t ?? '').trim().replace(/[.hH,]/g, ':').replace(/\s/g, '')
  let h; let m
  if (/^\d{1,2}:\d{1,2}$/.test(s)) [h, m] = s.split(':').map(Number)
  else if (/^\d{3,4}$/.test(s)) { h = Number(s.slice(0, -2)); m = Number(s.slice(-2)) }
  else if (/^\d{1,2}$/.test(s)) { h = Number(s); m = 0 }
  else return null
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? `${pad(h)}:${pad(m)}` : null
}

/**
 * Selector de hora con la estética de la app (como <Select> y <DatePicker>): se escribe con el teclado (730, 7:30, 19.30…; Enter o salir del
 * campo lo confirma; ↑ ↓ suben y bajan) o se elige en la tarjeta con las horas y los minutos. 24 horas. value: "HH:MM".
 */
export default function TimePicker({ value, onChange, label = 'Hora', step = 5, className = '', style, color = '#3185FC' }) {
  const [text, setText] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const box = useRef(null)
  const pop = useRef(null)
  useEffect(() => { setText(value ?? '') }, [value])
  const [vh, vm] = (parseTime(value) ?? '00:00').split(':').map(Number)

  const commit = (raw = text) => {
    const v = parseTime(raw)
    if (v && v !== value) onChange(v)
    setText(v ?? value ?? '')
  }
  const place = () => {
    const r = box.current.getBoundingClientRect()
    const w = 156
    const h = 260
    const below = window.innerHeight - r.bottom
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), ...(below < h + 12 && r.top > below ? { bottom: window.innerHeight - r.top + 6 } : { top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - h - 8)) }) })
  }
  const show = () => { commit(); place(); setOpen(true) }

  useLayoutEffect(() => {
    if (!open) return
    pop.current?.querySelectorAll('.tp-col').forEach((col) => { const on = col.querySelector('.on'); if (on) col.scrollTop = on.offsetTop - col.clientHeight / 2 + on.clientHeight / 2 })
  }, [open])
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!pop.current?.contains(e.target) && !box.current?.contains(e.target)) setOpen(false) }
    const gone = (e) => { if (!pop.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    window.addEventListener('resize', gone)
    window.addEventListener('scroll', gone, true)
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('resize', gone); window.removeEventListener('scroll', gone, true) }
  }, [open])

  const minutes = [...new Set([...Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step), vm])].sort((a, b) => a - b)
  const set = (h, m) => onChange(`${pad(h)}:${pad(m)}`)
  const bump = (d) => { const t = (((vh * 60 + vm + d * step) % 1440) + 1440) % 1440; set(Math.floor(t / 60), t % 60) }
  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); setOpen(false) }
    else if (e.key === 'Escape') { setText(value ?? ''); setOpen(false) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); bump(1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1) }
  }

  return (
    <>
      <span ref={box} className={`sel tp ${open ? 'is-open' : ''} ${className}`} style={{ '--c': color, ...style }}>
        <input className="tp-in" value={text} inputMode="numeric" maxLength={5} aria-label={label} placeholder="--:--"
          onChange={(e) => setText(e.target.value)} onBlur={() => commit()} onKeyDown={onKey} onFocus={(e) => e.target.select()} />
        <button type="button" className="tp-btn" onClick={() => (open ? setOpen(false) : show())} aria-haspopup="dialog" aria-expanded={open} aria-label={`Elegir ${label.toLowerCase()}`} title="Elegir hora"><Icon name="clock" size={16} /></button>
      </span>
      {open && pos && createPortal(
        <div ref={pop} className="tp-pop" role="dialog" aria-label={label} style={{ ...pos, '--c': color }}>
          <div className="tp-col" role="listbox" aria-label="Horas">
            {Array.from({ length: 24 }, (_, h) => <button type="button" key={h} role="option" aria-selected={h === vh} className={`tp-opt ${h === vh ? 'on' : ''}`} onClick={() => set(h, vm)}>{pad(h)}</button>)}
          </div>
          <div className="tp-col" role="listbox" aria-label="Minutos">
            {minutes.map((m) => <button type="button" key={m} role="option" aria-selected={m === vm} className={`tp-opt ${m === vm ? 'on' : ''}`} onClick={() => { set(vh, m); setOpen(false) }}>{pad(m)}</button>)}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
