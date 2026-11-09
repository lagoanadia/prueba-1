/*
 * PREGUNTAS INICIALES DE CADA ÁREA
 * La primera vez que abres un área, en vez de datos de ejemplo te hacemos unas preguntas
 * y con tus respuestas rellenamos los widgets.
 *
 * Cada paso: { id, title, type, ... }
 *   tags   -> varias palabras (con sugerencias y se pueden añadir nuevas)
 *   multi  -> elegir varias de una lista cerrada
 *   choice -> elegir una
 *   days   -> días de la semana
 *   items  -> una lista de cosas con varios campos (p. ej. nombre + fecha)
 * build(respuestas) -> datos del tablero del área.
 */
import { addDays, todayISO } from '../lib/dates.js'
import { SPORT_SUGGESTIONS } from '../widgets/salud/sports.js'
import { SAMPLE_DISHES } from '../widgets/comida/food.js'

const COLORS = ['#3185FC', '#E84855', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF']
const id = () => crypto.randomUUID()
const pad = (n) => String(n).padStart(2, '0')
const toHHMM = (min) => `${Math.floor(min / 60)}:${pad(min % 60)}`

export const FLOWS = {
  journal: {
    steps: [
      { id: 'habits', type: 'tags', title: '¿Qué hábitos quieres seguir?', suggestions: ['Leer', 'Meditar', 'Escribir', 'Beber agua', 'Estirar', 'Sin móvil antes de dormir'], placeholder: 'Otro hábito' },
      { id: 'goals', type: 'items', title: '¿Alguna meta para este año?', fields: [{ key: 'name', placeholder: 'Leer 12 libros' }, { key: 'target', type: 'number', placeholder: '12', width: 70 }] },
    ],
    build: (a) => ({
      habits: (a.habits ?? []).map((name, i) => ({ id: id(), name, color: COLORS[i % COLORS.length] })),
      goals: (a.goals ?? []).filter((g) => g.name && Number(g.target) > 0).map((g) => ({ id: id(), name: g.name, current: 0, target: Number(g.target) })),
    }),
  },

  salud: {
    steps: [
      { id: 'sports', type: 'tags', title: '¿Qué deportes haces?', suggestions: SPORT_SUGGESTIONS, placeholder: 'Otro deporte' },
      { id: 'days', type: 'days', title: '¿Qué días entrenas?' },
      { id: 'weeklyGoal', type: 'choice', title: '¿Cuánto quieres moverte a la semana?', options: [{ value: 90, label: '90 min' }, { value: 150, label: '150 min' }, { value: 300, label: '300 min' }], initial: 150 },
      { id: 'waterGoal', type: 'choice', title: '¿Cuántos vasos de agua al día?', options: [6, 8, 10].map((v) => ({ value: v, label: `${v} vasos` })), initial: 8 },
      { id: 'sleepGoal', type: 'choice', title: '¿Cuántas horas quieres dormir?', options: [7, 8, 9].map((v) => ({ value: v, label: `${v} h` })), initial: 8 },
    ],
    build: (a) => {
      const sports = a.sports ?? []
      let k = 0
      // Reparte tus deportes entre los días que entrenas; el resto, descanso
      const plan = Array.from({ length: 7 }, (_, i) => ((a.days ?? []).includes(i) ? (sports.length ? sports[k++ % sports.length] : 'Descanso') : 'Descanso'))
      return { sports, plan, weeklyGoal: a.weeklyGoal ?? 150, waterGoal: a.waterGoal ?? 8, sleepGoal: a.sleepGoal ?? 8 }
    },
  },

  trabajo: {
    steps: [
      { id: 'projects', type: 'items', title: '¿En qué proyectos estás?', fields: [{ key: 'name', placeholder: 'Web para un cliente' }, { key: 'deadline', type: 'date' }] },
      { id: 'focusMinutes', type: 'choice', title: '¿Cuánto dura tu bloque de concentración?', options: [25, 45, 50, 90].map((v) => ({ value: v, label: `${v} min` })), initial: 25 },
    ],
    build: (a) => {
      const projects = (a.projects ?? []).filter((p) => p.name).map((p) => ({ id: id(), name: p.name, deadline: p.deadline || addDays(todayISO(), 30), tasks: [] }))
      return { projects, activeProject: projects[0]?.id, focusMinutes: a.focusMinutes ?? 25 }
    },
  },

  comida: {
    steps: [
      { id: 'meals', type: 'multi', title: '¿Qué comidas quieres planificar?', options: [{ value: 'desayuno', label: 'Desayuno' }, { value: 'comida', label: 'Comida' }, { value: 'merienda', label: 'Merienda' }, { value: 'cena', label: 'Cena' }], initial: ['comida', 'cena'] },
      { id: 'dishes', type: 'tags', title: '¿Qué platos sueles cocinar?', suggestions: SAMPLE_DISHES.map((d) => d.name), placeholder: 'Otro plato' },
      { id: 'batchDay', type: 'choice', title: '¿Qué día haces batch cooking?', options: [{ value: 'domingo', label: 'Domingo' }, { value: 'sábado', label: 'Sábado' }, { value: null, label: 'No hago' }], initial: 'domingo' },
    ],
    build: (a) => ({
      meals: a.meals?.length ? ['desayuno', 'comida', 'merienda', 'cena'].filter((m) => a.meals.includes(m)) : ['comida', 'cena'], // en el orden del día
      // Si eliges un plato de las sugerencias, viene con su receta; si es tuyo, empieza vacío
      dishes: (a.dishes ?? []).map((name) => {
        const sample = SAMPLE_DISHES.find((d) => d.name === name)
        return sample ? { ...sample, id: id() } : { id: id(), name, for: ['comida', 'cena'], time: null, ingredients: [], steps: [] }
      }),
      batchDay: a.batchDay ?? null,
    }),
  },

  estudios: {
    steps: [
      { id: 'subjects', type: 'items', title: '¿Qué asignaturas tienes?', fields: [{ key: 'short', placeholder: 'PSP', width: 80 }, { key: 'name', placeholder: 'Programación de Servicios y Procesos' }] },
      { id: 'start', type: 'choice', title: '¿A qué hora empiezan tus clases?', options: ['8:00', '8:30', '9:00', '15:00'].map((v) => ({ value: v, label: v })), initial: '8:30' },
      { id: 'length', type: 'choice', title: '¿Cuánto dura cada clase?', options: [50, 55, 60].map((v) => ({ value: v, label: `${v} min` })), initial: 55 },
      { id: 'assignments', type: 'items', title: '¿Tienes alguna entrega pronto?', fields: [{ key: 'title', placeholder: 'Práctica UD1' }, { key: 'course', placeholder: 'PSP', width: 80 }, { key: 'due', type: 'date' }] },
    ],
    build: (a) => {
      const subjects = (a.subjects ?? []).filter((s) => s.short || s.name).map((s, i) => ({
        id: id(), short: (s.short || s.name).slice(0, 6).toUpperCase(), name: s.name || s.short, color: COLORS[i % COLORS.length],
        units: [{ id: id(), name: 'UD1', topics: [] }],
      }))
      const [h, m] = (a.start ?? '8:30').split(':').map(Number)
      const len = a.length ?? 55
      const slots = Array.from({ length: 6 }, (_, i) => `${toHHMM(h * 60 + m + i * len)}-${toHHMM(h * 60 + m + (i + 1) * len)}`)
      return {
        subjects,
        activeSubject: subjects[0]?.id,
        timetable: { slots, cells: {} },
        assignments: (a.assignments ?? []).filter((x) => x.title && x.due).map((x) => ({ id: id(), title: x.title, course: (x.course || subjects[0]?.short || '').toUpperCase(), due: x.due, done: false })),
      }
    },
  },

  calendario: {
    steps: [
      { id: 'birthdays', type: 'items', title: '¿Qué cumpleaños no quieres olvidar?', fields: [{ key: 'name', placeholder: 'Mamá' }, { key: 'date', type: 'date' }] },
      { id: 'events', type: 'items', title: '¿Alguna fecha importante pronto?', fields: [{ key: 'title', placeholder: 'Viaje a Lisboa' }, { key: 'date', type: 'date' }] },
    ],
    build: (a) => ({
      events: [
        ...(a.birthdays ?? []).filter((b) => b.name && b.date).map((b) => ({ id: id(), title: `Cumpleaños de ${b.name}`, date: b.date, type: 'cumpleaños', area: null, done: false })),
        ...(a.events ?? []).filter((e) => e.title && e.date).map((e) => ({ id: id(), title: e.title, date: e.date, type: 'evento', area: null, done: false })),
      ],
    }),
  },
}
