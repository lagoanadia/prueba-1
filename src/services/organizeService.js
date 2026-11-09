import { request } from './api.js'
import { getLang } from '../i18n/index.js'

/** Pide a la IA una organización en unidades y temas. docs: [{ id, name, pages, text }] */
export const proposeOrganization = (subject, docs) => request('/api/organize', { method: 'POST', body: { subject, docs, lang: getLang() } })
