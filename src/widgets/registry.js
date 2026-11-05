/*
 * REGISTRO DE WIDGETS
 *
 * Cada widget es un componente que recibe { size, data, update } y pinta una vista distinta
 * para cada tamaño (como los widgets de iPhone):
 *   S = 1x1 celdas · M = 2x1 · L = 2x2
 * `data` es el almacén del tablero del área; `update(fn)` lo cambia y se guarda solo.
 *
 * Para añadir un widget nuevo: crea el componente y añádelo aquí con su área.
 */
import Mood from './journal/Mood.jsx'
import Goals from './journal/Goals.jsx'
import Word from './journal/Word.jsx'
import Bottle from './journal/Bottle.jsx'
import Good from './journal/Good.jsx'
import Pixels from './journal/Pixels.jsx'

export const SIZES = ['S', 'M', 'L']

export const WIDGETS = {
  mood: { area: 'journal', name: 'Ánimo', color: '#F9DC5C', component: Mood },
  goals: { area: 'journal', name: 'Metas', color: '#3185FC', component: Goals },
  pixels: { area: 'journal', name: 'Pixels', color: '#3DDC97', component: Pixels },
  word: { area: 'journal', name: 'Palabra del día', color: '#F9DC5C', component: Word },
  bottle: { area: 'journal', name: 'Botellas', color: '#EFABFF', component: Bottle },
  good: { area: 'journal', name: 'Algo bueno', color: '#3DDC97', component: Good },
}

export const widgetsFor = (area) => Object.entries(WIDGETS).filter(([, w]) => w.area === area).map(([type, w]) => ({ type, ...w }))

// Tablero inicial de cada área (hasta que el usuario lo personaliza).
const DEFAULTS = {
  journal: [['mood', 'L'], ['goals', 'M'], ['word', 'M'], ['pixels', 'L'], ['bottle', 'M'], ['good', 'M']],
}

export const defaultLayout = (area) => (DEFAULTS[area] ?? []).map(([type, size]) => ({ id: crypto.randomUUID(), type, size }))
