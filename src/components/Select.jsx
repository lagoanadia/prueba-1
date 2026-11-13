import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Desplegable con la estética de la app (en vez del del sistema): una tarjeta redondeada
 * con las opciones como píldoras de su color. Se maneja con ratón, dedo o teclado (flechas, Enter, Esc).
 * options: [{ value, label, color? }]
 */
export default function Select({ value, options, onChange, label, className = '', style, placeholder = '—' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [hi, setHi] = useState(0) // opción resaltada con el teclado
  const btn = useRef(null)
  const list = useRef(null)
  const current = options.find((o) => o.value === value)

  const place = () => {
    const r = btn.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const h = Math.min(320, options.length * 40 + 12)
    setPos({ left: Math.min(r.left, window.innerWidth - Math.max(r.width, 180) - 8), width: Math.max(r.width, 180), ...(below < h + 12 && r.top > below ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) })
  }
  const show = () => { place(); setHi(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true) }
  const pick = (v) => { setOpen(false); if (v !== value) onChange(v); btn.current?.focus() }

  useLayoutEffect(() => { if (open) list.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }) }, [open])
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!list.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false) }
    const away = () => setOpen(false)
    const awayScroll = (e) => { if (!list.current?.contains(e.target)) setOpen(false) } // el scroll de la propia lista (al centrar la opción elegida) no la cierra
    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', away)
    window.addEventListener('scroll', awayScroll, true)
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('resize', away); window.removeEventListener('scroll', awayScroll, true) }
  }, [open])

  const onKey = (e) => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show() } return }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[hi].value) }
  }

  return (
    <>
      <button ref={btn} type="button" className={`sel ${open ? 'is-open' : ''} ${className}`} style={{ ...(current?.color ? { '--c': current.color } : {}), ...style }}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey} aria-haspopup="listbox" aria-expanded={open} aria-label={label}>
        <span className="sel-value">{current?.label ?? placeholder}</span>
        <svg className="sel-chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && pos && createPortal(
        <ul ref={list} className="sel-list" role="listbox" aria-label={label} style={pos}>
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={`sel-opt ${i === hi ? 'is-hi' : ''}`}
              style={{ '--c': o.color ?? '#F1F3F4', '--i': i }} onPointerEnter={() => setHi(i)} onClick={() => pick(o.value)}>
              <span className="sel-dot" />{o.label}
              {o.value === value && <svg className="sel-check" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5 6 10l5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  )
}
