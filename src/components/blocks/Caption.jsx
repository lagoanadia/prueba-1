/** Título de una foto o galería: una línea con barra azul, pegada al bloque (se mueve y se exporta con él). */
export default function Caption({ value, onChange, show }) {
  if (!value && !show) return null
  return (
    <div className="cap" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Título de la foto" aria-label="Título de la foto" maxLength={140} spellCheck />
    </div>
  )
}
