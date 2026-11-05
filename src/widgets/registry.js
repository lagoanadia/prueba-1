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
import Projects from './trabajo/Projects.jsx'
import Kanban from './trabajo/Kanban.jsx'
import Priorities from './trabajo/Priorities.jsx'
import Focus from './trabajo/Focus.jsx'
import Deadlines from './trabajo/Deadlines.jsx'
import Menu from './comida/Menu.jsx'
import Dishes from './comida/Dishes.jsx'
import Recipe from './comida/Recipe.jsx'
import Shopping from './comida/Shopping.jsx'
import Batch from './comida/Batch.jsx'
import Subjects from './estudios/Subjects.jsx'
import Syllabus from './estudios/Syllabus.jsx'
import Timetable from './estudios/Timetable.jsx'
import Assignments from './estudios/Assignments.jsx'
import Resources from './estudios/Resources.jsx'

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
  projects: { area: 'trabajo', name: 'Proyectos', color: '#E84855', component: Projects },
  kanban: { area: 'trabajo', name: 'Tablero', color: '#3185FC', component: Kanban },
  priorities: { area: 'trabajo', name: 'Prioridades de hoy', color: '#F9DC5C', component: Priorities },
  focus: { area: 'trabajo', name: 'Foco', color: '#E84855', component: Focus },
  deadlines: { area: 'trabajo', name: 'Próximas entregas', color: '#8E7CFF', component: Deadlines },
  menu: { area: 'comida', name: 'Menú semanal', color: '#EFABFF', component: Menu },
  dishes: { area: 'comida', name: 'Mis platos', color: '#FF9F43', component: Dishes },
  recipe: { area: 'comida', name: 'Receta', color: '#3DDC97', component: Recipe },
  shopping: { area: 'comida', name: 'Lista de la compra', color: '#3185FC', component: Shopping },
  batch: { area: 'comida', name: 'Batch cooking', color: '#E84855', component: Batch },
  subjects: { area: 'estudios', name: 'Asignaturas', color: '#3185FC', component: Subjects },
  syllabus: { area: 'estudios', name: 'Temario', color: '#3DDC97', component: Syllabus },
  timetable: { area: 'estudios', name: 'Horario', color: '#F9DC5C', component: Timetable },
  assignments: { area: 'estudios', name: 'Entregas', color: '#E84855', component: Assignments },
  resources: { area: 'estudios', name: 'Recursos', color: '#8E7CFF', component: Resources },
}

export const widgetsFor = (area) => Object.entries(WIDGETS).filter(([, w]) => w.area === area).map(([type, w]) => ({ type, ...w }))

// Tablero inicial de cada área (hasta que el usuario lo personaliza).
const DEFAULTS = {
  journal: [['mood', 'L'], ['goals', 'L'], ['bottle', 'L'], ['pixels', 'L'], ['good', 'M'], ['word', 'M']],
  salud: [['plan', 'L'], ['workouts', 'L'], ['progress', 'M'], ['water', 'M'], ['sleep', 'M']],
  trabajo: [['projects', 'L'], ['kanban', 'L'], ['priorities', 'M'], ['focus', 'M'], ['deadlines', 'M']],
  comida: [['menu', 'L'], ['recipe', 'L'], ['dishes', 'T'], ['shopping', 'T'], ['batch', 'M']],
  estudios: [['subjects', 'L'], ['syllabus', 'L'], ['timetable', 'L'], ['assignments', 'L'], ['resources', 'M']],
}

export const defaultLayout = (area) => (DEFAULTS[area] ?? []).map(([type, size]) => ({ id: crypto.randomUUID(), type, size }))
