// Modelo del horario: filas con duración; las horas se calculan en cadena a partir de la hora de inicio.
// timetable = { start: '8:30', rows: [{ id, kind: 'class'|'break', label?, dur }], cells: { 'rowId:día': valor }, labels: [{ id, name, color }] }
// Una casilla vale la sigla de una asignatura o «#idEtiqueta».
export const toMin = (t) => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(t).trim())
  if (!m) return null
  const h = Number(m[1]); const mm = Number(m[2])
  return h > 23 || mm > 59 ? null : h * 60 + mm
}
export const fmt = (min) => `${Math.floor(min / 60) % 24}:${String(min % 60).padStart(2, '0')}`
export const DEFAULT_CLASS = 50 // minutos
export const DEFAULT_BREAK = 20

/** Acepta el horario antiguo (lista de franjas «8:30-9:25») y lo convierte al modelo nuevo. */
export function normalizeTimetable(tt, subjects = []) {
  if (tt?.rows) return { start: tt.start ?? '8:30', rows: tt.rows, cells: tt.cells ?? {}, labels: tt.labels ?? [] }
  const slots = tt?.slots ?? []
  const shorts = new Set(subjects.map((s) => s.short))
  const rows = []
  const cells = {}
  let start = '8:30'
  slots.forEach((slot, i) => {
    const time = typeof slot === 'string' ? slot : slot.time
    const [a, b] = String(time).split('-')
    if (i === 0 && toMin(a) != null) start = fmt(toMin(a))
    const dur = toMin(a) != null && toMin(b) != null && toMin(b) > toMin(a) ? toMin(b) - toMin(a) : DEFAULT_CLASS
    const row = { id: crypto.randomUUID(), kind: typeof slot === 'string' ? 'class' : 'break', dur, ...(typeof slot === 'string' ? {} : { label: slot.label || 'Recreo' }) }
    rows.push(row)
    if (row.kind === 'class') for (let c = 0; c < 5; c++) { const v = tt.cells?.[`${c}-${i}`]; if (shorts.has(v)) cells[`${row.id}:${c}`] = v }
  })
  return { start, rows, cells, labels: [] }
}

/** Hora de inicio y fin de cada fila. */
export function spans(tt) {
  let t = toMin(tt.start) ?? 510
  return tt.rows.map((r) => { const start = t; t += r.dur; return { start, end: t } })
}
