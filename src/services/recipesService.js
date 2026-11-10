import { request } from './api.js'
import { getLang } from '../i18n/index.js'

/** Pide a la IA las recetas que hay en un trozo de texto de un PDF (no guarda nada). */
export const extractRecipes = (text) => request('/api/recipes', { method: 'POST', body: { text, lang: getLang() } }).then((r) => r.recipes ?? [])
