import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { soft } from './helpers.js'

/**
 * Selector rápido de asignatura: un botón con la elegida y, al pulsarlo, la lista de asignaturas (se elige una y se cierra).
 * `value` = lista con una sigla (o vacía = sin vincular). Se cierra al pulsar fuera o con Escape.
 */
const SWATCHES = ['#F08A24', '#3185FC', '#E8618C', '#1FA463', '#7C4DDB', '#F2B705', '#00A3A3', '#8D6E63']

export default function SubjectPicker({ subjects, value, onChange, label = 'Asignatura', compact = false, className = '', onCreate = null, onDelete = null }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('') // nueva etiqueta con el nombre que quieras
  const [swatch, setSwatch] = useState(null)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  const chosen = subjects.filter((s) => value.includes(s.short))
  const taken = new Set(subjects.map((x) => x.short.toLowerCase()))
  const create = (e) => {
    e?.preventDefault(); e?.stopPropagation()
    const n = name.trim()
    if (!n || taken.has(n.toLowerCase())) return
    onCreate(n, swatch ?? SWATCHES[subjects.filter((x) => x.custom).length % SWATCHES.length])
    onChange([n]); setName(''); setSwatch(null); setOpen(false)
  }
  const pick = (short) => { onChange(value.includes(short) ? [] : [short]); setOpen(false) } // una sola asignatura; volver a pulsarla la quita
  return (
    <span className={`sp ${className}`} ref={box} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className={`sp-btn ${compact ? 'is-compact' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${chosen.map((s) => s.short).join(', ') || 'sin etiqueta'}`} title="Cambiar de asignatura">
        {chosen.length
          ? chosen.map((s) => (compact ? <i key={s.id ?? s.short} className="sp-dot" style={{ background: s.color }} /> : <span key={s.id ?? s.short} className="sp-chip" style={{ background: soft(s.color, 38), color: s.color }}>{s.short}</span>))
          : <span className="sp-none">{compact ? '' : 'Sin etiqueta'}</span>}
        <span className="sp-plus" aria-hidden="true"><Icon name={chosen.length ? 'down' : 'plus'} size={11} strokeWidth={3} /></span>
      </button>
      {open && (
        <div className="card sp-pop" role="listbox" aria-label={label}>
          <b className="sp-h">{onCreate ? 'Asignatura o etiqueta' : 'Asignatura'}</b>
          {subjects.map((s) => {
            const on = value.includes(s.short)
            return (
              <span key={s.id ?? s.short} className="sp-row">
                <button type="button" role="option" aria-selected={on} className={`sp-opt ${on ? 'on' : ''}`} style={on ? { background: soft(s.color, 30) } : undefined} onClick={() => pick(s.short)}>
                  <i className="sp-box" style={{ borderColor: s.color, background: on ? s.color : '#FFFFFF' }}>{on && <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.5} />}</i><span className="w-ellipsis">{s.short}</span>
                </button>
                {s.custom && onDelete && <button type="button" className="sp-del" onClick={() => onDelete(s.short)} aria-label={`Borrar la etiqueta ${s.short}`} title="Borrar etiqueta"><Icon name="close" size={12} /></button>}
              </span>
            )
          })}
          {onCreate && (
            <div className="sp-new">
              <input value={name} maxLength={24} placeholder="Nueva etiqueta…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(e) }} aria-label="Nombre de la nueva etiqueta" />
              <span className="sp-sw" role="group" aria-label="Color">{SWATCHES.map((c) => <button type="button" key={c} className={(swatch ?? SWATCHES[subjects.filter((x) => x.custom).length % SWATCHES.length]) === c ? 'on' : ''} style={{ background: c }} onClick={() => setSwatch(c)} aria-label={`Color ${c}`} />)}</span>
              <button type="button" className="sp-add" onClick={create} disabled={!name.trim() || taken.has(name.trim().toLowerCase())}>Crear</button>
            </div>
          )}
          {value.length > 0 && <button type="button" className="sp-clear" onClick={() => { onChange([]); setOpen(false) }}>Quitar</button>}
        </div>
      )}
    </span>
  )
}
