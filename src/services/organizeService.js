import { request } from './api.js'
import { getLang } from '../i18n/index.js'

/** Pide a la IA una organización en unidades y temas. docs: [{ id, name, pages, text }] */
export const proposeOrganization = (subject, docs) => request('/api/organize', { method: 'POST', body: { subject, docs, lang: getLang() } })

/** Pide a la IA que ordene unas notas de un hito en tareas cortas. Solo propone: devuelve { tasks: [texto] }. */
export const proposeTasksFromNotes = (project, milestone, notes) => request('/api/tasknotes', { method: 'POST', body: { project, milestone, notes, lang: getLang() } })
