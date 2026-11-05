/*
 * REGISTRO DE WIDGETS
 *
 * Cada widget es un componente que recibe { size, data, update } y pinta una vista distinta
 * para cada tamaño (como los widgets de iPhone):
 *   S = 1x1 celdas · T = 1x2 (vertical, para listas) · M = 2x1 · L = 2x2
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
import Plan from './salud/Plan.jsx'
import Workouts from './salud/Workouts.jsx'
import Progress from './salud/Progress.jsx'
import Water from './salud/Water.jsx'
import Sleep from './salud/Sleep.jsx'

export const SIZES = ['S', 'T', 'M', 'L']

export const WIDGETS = {
  mood: { area: 'journal', name: 'Mood tracker', color: '#F9DC5C', component: Mood },
  goals: { area: 'journal', name: 'Metas', color: '#3185FC', component: Goals },
  pixels: { area: 'journal', name: 'Pixels', color: '#3DDC97', component: Pixels },
  word: { area: 'journal', name: 'Palabra del día', color: '#F9DC5C', component: Word },
  bottle: { area: 'journal', name: 'Cápsulas del tiempo', color: '#EFABFF', component: Bottle },
  good: { area: 'journal', name: 'Una cosa buena del día', color: '#3DDC97', component: Good },
  plan: { area: 'salud', name: 'Plan semanal', color: '#3DDC97', component: Plan },
  workouts: { area: 'salud', name: 'Entrenamientos', color: '#E84855', component: Workouts },
  progress: { area: 'salud', name: 'Evolución', color: '#3185FC', component: Progress },
  water: { area: 'salud', name: 'Agua', color: '#3185FC', component: Water },
  sleep: { area: 'salud', name: 'Sueño', color: '#8E7CFF', component: Sleep },
}

export const widgetsFor = (area) => Object.entries(WIDGETS).filter(([, w]) => w.area === area).map(([type, w]) => ({ type, ...w }))

// Tablero inicial de cada área (hasta que el usuario lo personaliza).
const DEFAULTS = {
  journal: [['mood', 'L'], ['goals', 'L'], ['bottle', 'L'], ['pixels', 'L'], ['good', 'M'], ['word', 'M']],
  salud: [['plan', 'L'], ['workouts', 'L'], ['progress', 'M'], ['water', 'M'], ['sleep', 'M']],
}

export const defaultLayout = (area) => (DEFAULTS[area] ?? []).map(([type, size]) => ({ id: crypto.randomUUID(), type, size }))
