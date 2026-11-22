import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { soft } from './helpers.js'

/**
 * Selector rápido de asignatura: un botón con la elegida y, al pulsarlo, la lista de asignaturas (se elige una y se cierra).
 * `value` = lista con una sigla (o vacía = sin vincular). Se cierra al pulsar fuera o con Escape.
 */
export default function SubjectPicker({ subjects, value, onChange, label = 'Asignatura', compact = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  const chosen = subjects.filter((s) => value.includes(s.short))
  const pick = (short) => { onChange(value.includes(short) ? [] : [short]); setOpen(false) } // una sola asignatura; volver a pulsarla la quita
  return (
    <span className={`sp ${className}`} ref={box} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className={`sp-btn ${compact ? 'is-compact' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${chosen.map((s) => s.short).join(', ') || 'sin vincular'}`} title="Cambiar de asignatura">
        {chosen.length
          ? chosen.map((s) => (compact ? <i key={s.id ?? s.short} className="sp-dot" style={{ background: s.color }} /> : <span key={s.id ?? s.short} className="sp-chip" style={{ background: soft(s.color, 38), color: s.color }}>{s.short}</span>))
          : <span className="sp-none">{compact ? '' : 'Sin vincular'}</span>}
        <span className="sp-plus" aria-hidden="true"><Icon name={chosen.length ? 'down' : 'plus'} size={11} strokeWidth={3} /></span>
      </button>
      {open && (
        <div className="card sp-pop" role="listbox" aria-label={label}>
          <b className="sp-h">Asignatura</b>
          {subjects.map((s) => {
            const on = value.includes(s.short)
            return (
              <button type="button" key={s.id ?? s.short} role="option" aria-selected={on} className={`sp-opt ${on ? 'on' : ''}`} style={on ? { background: soft(s.color, 30) } : undefined} onClick={() => pick(s.short)}>
                <i className="sp-box" style={{ borderColor: s.color, background: on ? s.color : '#FFFFFF' }}>{on && <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.5} />}</i>{s.short}
              </button>
            )
          })}
          {value.length > 0 && <button type="button" className="sp-clear" onClick={() => { onChange([]); setOpen(false) }}>Sin vincular</button>}
        </div>
      )}
    </span>
  )
}
