import { request } from './api.js'
import { getLang } from '../i18n/index.js'

/** Sugerencias de la IA para los ingredientes de un plato (no guarda nada). */
export const suggestIngredients = (dish, have) => request('/api/ingredients', { method: 'POST', body: { dish, have, lang: getLang() } }).then((r) => ({ suggestions: r.suggestions ?? [], spices: r.spices ?? [], reason: r.reason ?? null }))

/** La IA dice cuáles de estos nombres son especias (si no responde, vacío: se usa la lista incorporada). */
export const classifySpices = (names) => request('/api/ingredients', { method: 'POST', body: { classify: names, lang: getLang() } }).then((r) => r.spices ?? []).catch(() => [])
