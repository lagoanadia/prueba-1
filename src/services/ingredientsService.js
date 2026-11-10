import { request } from './api.js'
import { getLang } from '../i18n/index.js'

/** Sugerencias de la IA para los ingredientes de un plato (no guarda nada). */
export const suggestIngredients = (dish, have) => request('/api/ingredients', { method: 'POST', body: { dish, have, lang: getLang() } }).then((r) => r.suggestions ?? [])
