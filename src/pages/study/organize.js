// Organizar una asignatura a partir de sus documentos: modelo editable de la propuesta y cómo se aplica.
const uid = () => crypto.randomUUID()
const stem = (name) => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()

/** Propuesta sencilla por los nombres de archivo (por si la IA no está disponible). */
export function fallbackProposal(docs) {
  const units = new Map()
  for (const d of docs) {
    const n = stem(d.file.name)
    const u = /(?:^|\b)(?:ud|unidad)\s*\.?\s*(\d+)/i.exec(n)?.[1]
    const t = /(?:^|\b)tema\s*\.?\s*(\d+)/i.exec(n)?.[1]
    const unitName = u ? `UD ${u}` : t ? 'Temario' : 'Documentos'
    const topicName = t ? `Tema ${t}` : n
    const unit = units.get(unitName) ?? units.set(unitName, new Map()).get(unitName)
    unit.set(topicName, [...(unit.get(topicName) ?? []), d.id])
  }
  return {
    units: [...units].map(([name, topics]) => ({ name, topics: [...topics].map(([tn, ids]) => ({ name: tn, docs: ids.map((id) => ({ id, why: 'Agrupado por el nombre del archivo.', confidence: 'revisar' })) })) })),
    unassigned: [],
  }
}

/** Respuesta de la IA (o de la propuesta sencilla) → modelo que se edita en pantalla. */
export function buildReview(result, docs) {
  const info = {}
  docs.forEach((d) => { info[d.id] = { file: d.file, pages: d.pages, why: '', conf: 'seguro', readable: d.readable } })
  const units = result.units.map((u) => ({
    id: uid(), name: u.name,
    topics: u.topics.map((t) => ({ id: uid(), name: t.name, docs: t.docs.map((d) => { info[d.id].why = d.why; info[d.id].conf = d.confidence === 'revisar' || !info[d.id].readable ? 'revisar' : 'seguro'; return d.id }) })),
  }))
  const loose = result.unassigned.map((d) => { info[d.id].why = d.why; info[d.id].conf = 'revisar'; return d.id })
  return { units, loose, docs: info }
}

export const countReview = (r) => ({
  units: r.units.filter((u) => u.topics.length).length,
  topics: r.units.reduce((n, u) => n + u.topics.length, 0),
  docs: r.units.reduce((n, u) => n + u.topics.reduce((m, t) => m + t.docs.length, 0), 0),
  loose: r.loose.length,
})

/** Unidades nuevas de la asignatura + recursos para lo que quede sin clasificar. */
export function applyReview(review, subjectId) {
  const units = review.units.filter((u) => u.topics.length).map((u) => ({
    id: uid(), name: u.name, practices: [],
    topics: u.topics.map((t) => ({ id: uid(), name: t.name, state: 'todo', pdfs: t.docs.map((id) => review.docs[id].file) })),
  }))
  const resources = review.loose.map((id) => ({ id: uid(), title: review.docs[id].file.name, file: review.docs[id].file, subjectId, unitId: null }))
  return { units, resources }
}
