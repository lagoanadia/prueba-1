// Documentos de trabajo: plantillas pensadas para proyectos (actas, briefing, presupuesto…)
import { newBlock, toDoc } from '../../lib/docModel.js'
import { formatLong, todayISO } from '../../lib/dates.js'

const b = newBlock
export const DOC_KINDS = {
  blank: { label: 'En blanco', color: '#F1F3F4', hint: 'Empieza desde cero' },
  meeting: { label: 'Acta de reunión', color: '#3185FC', hint: 'Asistentes, temas, acuerdos y siguientes pasos' },
  brief: { label: 'Briefing', color: '#EFABFF', hint: 'Objetivo, público, alcance y entregables' },
  quote: { label: 'Presupuesto', color: '#3DDC97', hint: 'Conceptos, horas, precio y condiciones' },
  report: { label: 'Informe semanal', color: '#F9DC5C', hint: 'Hecho, en curso, bloqueos y próxima semana' },
  retro: { label: 'Retrospectiva', color: '#FF9F43', hint: 'Qué fue bien, qué mejorar y acciones' },
}

/** Contenido inicial de cada plantilla (con el nombre del proyecto y la fecha de hoy). */
export function templateFor(kind, project) {
  const date = formatLong(todayISO())
  const blocks = {
    blank: () => [b('h1', ''), b()],
    meeting: () => [b('h1', `Reunión · ${project.name}`), b('callout', date), b('h2', 'Asistentes'), b('bullet'), b('h2', 'Temas'), b('numbered'), b('h2', 'Acuerdos'), b('bullet'), b('h2', 'Siguientes pasos'), b('todo')],
    brief: () => [b('h1', `Briefing · ${project.name}`), b('h2', 'Objetivo'), b('text'), b('h2', 'Público'), b('text'), b('h2', 'Alcance'), b('bullet'), b('h2', 'Fuera de alcance'), b('bullet'), b('h2', 'Entregables'), b('todo'), b('h2', 'Fechas clave'), b('bullet', project.deadline ? `Entrega final: ${formatLong(project.deadline)}` : '')],
    quote: () => [b('h1', `Presupuesto · ${project.name}`), b('callout', date), b('h2', 'Conceptos'), b('bullet', 'Concepto — horas × precio/hora'), b('h2', 'Total'), b('text', '0 €'), b('h2', 'Condiciones'), b('bullet', '50 % al empezar, 50 % a la entrega'), b('bullet', 'Validez: 30 días')],
    report: () => [b('h1', `Informe semanal · ${project.name}`), b('callout', date), b('h2', 'Hecho'), b('bullet'), b('h2', 'En curso'), b('bullet'), b('h2', 'Bloqueos'), b('bullet'), b('h2', 'La próxima semana'), b('todo')],
    retro: () => [b('h1', `Retrospectiva · ${project.name}`), b('h2', 'Qué fue bien'), b('bullet'), b('h2', 'Qué mejorar'), b('bullet'), b('h2', 'Acciones'), b('todo')],
  }[kind]()
  return toDoc(blocks)
}

/** Título del documento: su primer título, o el tipo. */
export const docTitle = (d) => {
  const h = d.doc?.blocks?.find((x) => x.type === 'h1')?.html?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return h || DOC_KINDS[d.kind]?.label || 'Documento'
}
export const docPreview = (d) => (d.doc?.blocks ?? []).filter((x) => !['h1', 'divider'].includes(x.type)).map((x) => x.html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()).filter(Boolean).slice(0, 3).join(' · ')
