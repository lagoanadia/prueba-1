// Datos compartidos por los widgets de Trabajo
export const PRIORITIES = { alta: '#E84855', media: '#F9DC5C', baja: '#3DDC97' }
export const STATES = [
  { id: 'todo', label: 'Pendientes' },
  { id: 'doing', label: 'En proceso' },
  { id: 'done', label: 'Completadas' },
]
export const projectsOf = (data) => data.projects ?? []
export const activeOf = (data) => projectsOf(data).find((p) => p.id === data.activeProject) ?? projectsOf(data)[0]
export const progressOf = (p) => {
  const total = p.tasks.length
  const done = p.tasks.filter((t) => t.status === 'done').length
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
}
/** Cambia una tarea de un proyecto (sin tocar el resto). */
export const updateTask = (d, projectId, taskId, changes) => ({
  ...d,
  projects: projectsOf(d).map((p) => (p.id !== projectId ? p : { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...changes } : t)) })),
})
