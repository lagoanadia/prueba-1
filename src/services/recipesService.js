import { request } from './api.js'
import { getLang } from '../i18n/index.js'

/** Pide a la IA las recetas de un trozo de texto de un PDF o de una foto (data URL). No guarda nada. */
export const extractRecipes = (text, image) => request('/api/recipes', { method: 'POST', body: image ? { image, lang: getLang() } : { text, lang: getLang() } }).then((r) => r.recipes ?? [])
