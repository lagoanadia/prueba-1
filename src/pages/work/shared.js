// Utilidades de la página de Trabajo
import { projectsOf } from '../../widgets/trabajo/projects.js'

export const PROJECT_COLORS = ['#E84855', '#3185FC', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF']
export const soft = (c, pct = 30) => `color-mix(in srgb, ${c} ${pct}%, #FFFFFF)`
/** Color de un proyecto (los antiguos no tenían: se elige por su posición). */
export const colorOf = (data, projectId) => {
  const list = projectsOf(data)
  const i = list.findIndex((p) => p.id === projectId)
  return list[i]?.color ?? PROJECT_COLORS[Math.max(0, i) % PROJECT_COLORS.length]
}
/** Proyectos elegidos para el tablero. Vacío = todos. */
export const selectedOf = (data) => {
  const ids = (data.selectedProjects ?? []).filter((id) => projectsOf(data).some((p) => p.id === id))
  return ids.length ? ids : projectsOf(data).map((p) => p.id)
}
export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0) }
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
