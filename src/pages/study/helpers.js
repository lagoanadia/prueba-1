// Utilidades compartidas por las pantallas de Estudios
export const soft = (c, pct = 30) => `color-mix(in srgb, ${c} ${pct}%, #FFFFFF)`
/** Los 10 colores que se pueden elegir para una asignatura. */
export const SUBJECT_PALETTE = ['#3185FC', '#E84855', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF', '#FF6FAE', '#22C7D6', '#9BD84A']
export const SUBJECT_COLORS = ['#3185FC', '#E84855', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF']

export const unitProgress = (u) => ({ clear: u.topics.filter((t) => t.state === 'clear').length, total: u.topics.length })
export const changeSubject = (update, subjectId, fn) => update((d) => ({ ...d, subjects: (d.subjects ?? []).map((s) => (s.id === subjectId ? fn(s) : s)) }))
export const changeUnit = (update, subjectId, unitId, fn) => changeSubject(update, subjectId, (s) => ({ ...s, units: s.units.map((u) => (u.id === unitId ? fn(u) : u)) }))

// Prácticas de una unidad (antes se llamaban ejercicios: { id, title, done })
export const practicesOf = (u) => u.practices ?? (u.exercises ?? []).map((x) => ({ id: x.id, name: x.title, done: x.done }))

// Tipos de entrega: cada uno con su icono
export const KINDS = { practica: { label: 'Práctica', icon: 'code' }, examen: { label: 'Examen', icon: 'exam' }, trabajo: { label: 'Trabajo', icon: 'doc' }, proyecto: { label: 'Proyecto', icon: 'star' } }

// Qué cuenta para el progreso de una asignatura (lo decide el usuario)
export const METRICS = { topics: { label: 'Teoría' }, practices: { label: 'Prácticas' }, assignments: { label: 'Entregas' } }
export const metricsOf = (s) => ({ topics: true, practices: true, assignments: false, ...(s.metrics ?? {}) })

export function progressFor(subject, assignments = []) {
  const units = subject.units
  const mine = assignments.filter((a) => a.course === subject.short)
  const counts = {
    topics: { done: units.reduce((n, u) => n + u.topics.filter((t) => t.state === 'clear').length, 0), total: units.reduce((n, u) => n + u.topics.length, 0) },
    practices: { done: units.reduce((n, u) => n + practicesOf(u).filter((p) => p.done).length, 0), total: units.reduce((n, u) => n + practicesOf(u).length, 0) },
    assignments: { done: mine.filter((a) => a.done).length, total: mine.length },
  }
  const on = metricsOf(subject)
  const picked = Object.keys(METRICS).filter((k) => on[k])
  const done = picked.reduce((n, k) => n + counts[k].done, 0)
  const total = picked.reduce((n, k) => n + counts[k].total, 0)
  return { counts, on, done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

// Normaliza un enlace escrito a mano; devuelve null si no es http(s)
export function cleanUrl(text) {
  const t = text.trim()
  if (!t) return null
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : null
  } catch { return null }
}
export const faviconOf = (url) => `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`

/** Enlaces que se pueden mostrar dentro de la app (iframe): YouTube, Vimeo y Google Drive tienen una dirección «embed». */
export function embedOf(url) {
  try {
    const u = new URL(url)
    const h = u.hostname.replace(/^www\./, '')
    if (h === 'youtu.be') return { src: `https://www.youtube.com/embed/${u.pathname.slice(1)}`, kind: 'video' }
    if (h === 'youtube.com' || h === 'm.youtube.com' || h === 'music.youtube.com') {
      const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1]
      if (id) return { src: `https://www.youtube.com/embed/${id}`, kind: 'video' }
    }
    if (h === 'vimeo.com') { const id = u.pathname.match(/\/(\d+)/)?.[1]; if (id) return { src: `https://player.vimeo.com/video/${id}`, kind: 'video' } }
    if (h === 'drive.google.com') { const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1]; if (id) return { src: `https://drive.google.com/file/d/${id}/preview`, kind: 'page' } }
    if (h === 'docs.google.com') return { src: url.replace(/\/(edit|view)(\?.*)?$/, '/preview'), kind: 'page' }
  } catch { /* enlace no válido */ }
  return { src: url, kind: 'page' }
}
