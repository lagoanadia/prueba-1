// Utilidades compartidas por las pantallas de Estudios
export const soft = (c, pct = 25) => `color-mix(in srgb, ${c} ${pct}%, #FFFFFF)`

// Colores pastel para las celdas del horario: la misma asignatura siempre del mismo color
const PASTELS = ['#C7D7FF', '#FFC9CF', '#FFDFA8', '#C9F0D9', '#E6CCFF', '#D9DCE0', '#FFE7F7', '#C5EFF7']
export function cellColor(text, subjects) {
  if (!text) return null
  const t = text.toUpperCase()
  const s = subjects.find((x) => t.includes(x.short.toUpperCase()))
  if (s) return soft(s.color, 40)
  let h = 0
  for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return PASTELS[h % PASTELS.length]
}

export const unitProgress = (u) => ({ clear: u.topics.filter((t) => t.state === 'clear').length, total: u.topics.length })
export const changeSubject = (update, subjectId, fn) => update((d) => ({ ...d, subjects: (d.subjects ?? []).map((s) => (s.id === subjectId ? fn(s) : s)) }))
export const changeUnit = (update, subjectId, unitId, fn) => changeSubject(update, subjectId, (s) => ({ ...s, units: s.units.map((u) => (u.id === unitId ? fn(u) : u)) }))
