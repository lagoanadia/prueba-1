import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { soft } from './helpers.js'

/**
 * Selector rápido de asignaturas (una o varias): un botón con las asignaturas elegidas y, al pulsarlo, una lista con casillas.
 * `value` = lista de siglas. Se cierra al pulsar fuera o con Escape.
 */
export default function SubjectPicker({ subjects, value, onChange, label = 'Asignaturas', compact = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  const chosen = subjects.filter((s) => value.includes(s.short))
  const toggle = (short) => onChange(value.includes(short) ? value.filter((x) => x !== short) : [...value, short])
  return (
    <span className={`sp ${className}`} ref={box} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className={`sp-btn ${compact ? 'is-compact' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${chosen.map((s) => s.short).join(', ') || 'sin vincular'}`} title="Cambiar de asignatura (puedes elegir varias)">
        {chosen.length
          ? chosen.map((s) => (compact ? <i key={s.id ?? s.short} className="sp-dot" style={{ background: s.color }} /> : <span key={s.id ?? s.short} className="sp-chip" style={{ background: soft(s.color, 38), color: s.color }}>{s.short}</span>))
          : <span className="sp-none">{compact ? '' : 'Sin vincular'}</span>}
        <span className="sp-plus" aria-hidden="true"><Icon name={chosen.length ? 'down' : 'plus'} size={11} strokeWidth={3} /></span>
      </button>
      {open && (
        <div className="card sp-pop" role="listbox" aria-multiselectable="true" aria-label={label}>
          <b className="sp-h">Asignaturas (una o varias)</b>
          {subjects.map((s) => {
            const on = value.includes(s.short)
            return (
              <button type="button" key={s.id ?? s.short} role="option" aria-selected={on} className={`sp-opt ${on ? 'on' : ''}`} style={on ? { background: soft(s.color, 30) } : undefined} onClick={() => toggle(s.short)}>
                <i className="sp-box" style={{ borderColor: s.color, background: on ? s.color : '#FFFFFF' }}>{on && <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.5} />}</i>{s.short}
              </button>
            )
          })}
          {value.length > 0 && <button type="button" className="sp-clear" onClick={() => onChange([])}>Quitar todas</button>}
        </div>
      )}
    </span>
  )
}
