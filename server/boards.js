/*
 * TABLEROS DE CADA ÁREA (Cloudflare KV)
 *
 * Cada área (journal, salud...) tiene un "tablero" por usuario:
 *   "board:<usuario>:<área>" -> { layout: [...widgets colocados], data: {...datos de los widgets} }
 *
 * layout: [{ id, type: 'habits', size: 'S' | 'M' | 'L' }]   -> qué widgets y en qué orden/tamaño
 * data:   lo que guardan los widgets (hábitos, estados de ánimo, diario...). Es libre: cada widget usa su parte.
 */
import { AREA_IDS } from '../src/data/areas.js'

const MAX_WIDGETS = 30
const MAX_BYTES = 200 * 1024 // 200 KB por tablero: de sobra para texto
const SIZES = ['S', 'T', 'M', 'L'] // T = vertical (1x2)

const key = (userId, area) => `board:${userId}:${area}`

// Tableros válidos: las 5 áreas + el calendario (eventos y cumpleaños propios)
export const isArea = (area) => AREA_IDS.includes(area) || area === 'calendario'

export async function getBoard(env, userId, area) {
  return (await env.DATA.get(key(userId, area), 'json')) ?? { layout: null, data: {} }
}

/** Devuelve un texto de error si el tablero no es válido, o null si está bien. */
export function validateBoard(board) {
  if (!board || typeof board !== 'object') return 'Invalid board'
  const { layout, data } = board
  if (!Array.isArray(layout) || layout.length > MAX_WIDGETS) return 'Invalid layout'
  for (const w of layout) {
    if (typeof w?.id !== 'string' || typeof w.type !== 'string' || !SIZES.includes(w.size)) return 'Invalid widget'
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Invalid data'
  if (JSON.stringify(board).length > MAX_BYTES) return 'Board too large'
  return null
}

export async function saveBoard(env, userId, area, { layout, data }) {
  await env.DATA.put(key(userId, area), JSON.stringify({ layout, data }))
}
