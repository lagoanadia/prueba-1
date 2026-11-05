// Datos compartidos por los widgets de Estudios
export const TOPIC_STATES = [
  { id: 'todo', label: 'Sin empezar', color: '#F1F3F4' },
  { id: 'doing', label: 'En curso', color: '#F9DC5C' },
  { id: 'clear', label: 'Claro', color: '#3DDC97' },
]
const t = (id, name, state = 'todo') => ({ id, name, state })

// Ejemplo (2º DAM) usado solo en los tests; la app empieza vacía y se rellena con las preguntas iniciales
export const SAMPLE_SUBJECTS = [
  { id: 'pmdm', short: 'PMDM', name: 'Programación multimedia y dispositivos móviles', color: '#3185FC', units: [
    { id: 'pmdm1', name: 'UD1', topics: [t('a1', 'Entorno Android', 'clear'), t('a2', 'Activities', 'clear'), t('a3', 'Layouts', 'clear'), t('a4', 'Intents', 'doing'), t('a5', 'Recursos'), t('a6', 'Ciclo de vida')] },
    { id: 'pmdm2', name: 'UD2', topics: [t('b1', 'RecyclerView'), t('b2', 'Fragments'), t('b3', 'Navegación')] }] },
  { id: 'psp', short: 'PSP', name: 'Programación de Servicios y Procesos', color: '#E84855', units: [
    { id: 'psp1', name: 'UD1 · Procesos', topics: [t('p1', 'Concepto de proceso y programa', 'clear'), t('p2', 'Estados y ciclo de vida', 'clear'), t('p3', 'Planificación de procesos', 'doing'), t('p4', 'Procesos con ProcessBuilder')] },
    { id: 'psp2', name: 'UD2 · Hilos', topics: [t('h1', 'Concepto de hilo y concurrencia'), t('h2', 'Thread y Runnable'), t('h3', 'Sincronización'), t('h4', 'Comunicación entre hilos'), t('h5', 'ExecutorService')] }] },
  { id: 'ad', short: 'AD', name: 'Acceso a Datos', color: '#3DDC97', units: [{ id: 'ad1', name: 'UD1', topics: [t('c1', 'Ficheros'), t('c2', 'JDBC'), t('c3', 'ORM')] }] },
  { id: 'di', short: 'DI', name: 'Desarrollo de Interfaces', color: '#EFABFF', units: [{ id: 'di1', name: 'UD1', topics: [t('e1', 'Componentes'), t('e2', 'Eventos'), t('e3', 'Usabilidad')] }] },
  { id: 'sge', short: 'SGE', name: 'Sistemas de Gestión Empresarial', color: '#F9DC5C', units: [{ id: 'sge1', name: 'UD1', topics: [t('f1', 'ERP y CRM'), t('f2', 'Odoo')] }] },
]

export const subjectsOf = (data) => data.subjects ?? []
export const activeSubjectOf = (data) => subjectsOf(data).find((s) => s.id === data.activeSubject) ?? subjectsOf(data)[0]
export const progressOf = (s) => {
  const topics = s.units.flatMap((u) => u.topics)
  const clear = topics.filter((x) => x.state === 'clear').length
  return { total: topics.length, clear, pct: topics.length ? Math.round((clear / topics.length) * 100) : 0 }
}
