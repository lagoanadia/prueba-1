/** Selector de chips pequeño (p. ej. Mes / Año, o los hábitos). */
export default function Chips({ options, value, onChange, small = false }) {
  return (
    <div className={`chips ${small ? 'chips-sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={value === o.id} className={`chip ${value === o.id ? 'chip-on' : ''}`}
          style={o.color ? { '--c': o.color } : undefined} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
