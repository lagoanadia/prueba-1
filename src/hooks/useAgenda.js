import useAllBoards from './useAllBoards.js'
import { AREA_IDS } from '../data/areas.js'
import { todayISO } from '../lib/dates.js'
import { MEALS, dishName, dishesOf } from '../widgets/comida/food.js'

/**
 * AGENDA DE HOY (pantalla de Inicio)
 * Junta lo que toca hoy en TODAS las áreas: tareas de trabajo, la sesión de Salud,
 * entregas de Estudios (las vencidas también), hábitos del Journal, las comidas del menú
 * y las tareas que apuntaste por voz. Marcar una casilla guarda el cambio en su área.
 */
export default function useAgenda(enabled, entries, toggleEntry) {
  const { boards, change, reload: load } = useAllBoards(enabled, AREA_IDS)

  const today = todayISO()
  const dayIdx = (new Date(`${today}T12:00:00`).getDay() + 6) % 7
  const items = []
  const d = (a) => boards[a]?.data ?? {}

  // Voz: lo de hoy y lo pendiente de días anteriores
  entries.filter((e) => e.date === today || (e.date && e.date < today && !e.done)).forEach((e) => items.push({
    key: 'e' + e.id, area: e.area, title: e.title, time: e.time, done: e.done, late: e.date < today, toggle: () => toggleEntry(e.id, !e.done),
  }))
  // Trabajo: tareas con fecha de hoy o vencidas (y las completadas hoy, para verlas marcadas)
  ;(d('trabajo').projects ?? []).forEach((p) => p.tasks.forEach((t) => {
    if (!t.due || t.due > today || (t.status === 'done' && t.doneAt !== today)) return
    items.push({ key: 't' + t.id, area: 'trabajo', title: t.title, done: t.status === 'done', late: t.status !== 'done' && t.due < today,
      toggle: () => change('trabajo', (x) => ({ ...x, projects: x.projects.map((pp) => (pp.id !== p.id ? pp : { ...pp, tasks: pp.tasks.map((tt) => (tt.id !== t.id ? tt : tt.status === 'done' ? { ...tt, status: 'todo', doneAt: null } : { ...tt, status: 'done', doneAt: today })) })) })) })
  }))
  // Trabajo: reuniones y eventos de la agenda de hoy (con su hora)
  ;(d('trabajo').meetings ?? []).filter((m) => m.date === today).sort((a, b) => a.start.localeCompare(b.start)).forEach((m) => {
    items.push({ key: 'm' + m.id, area: 'trabajo', title: m.title, time: m.start, done: Boolean(m.done),
      toggle: () => change('trabajo', (x) => ({ ...x, meetings: x.meetings.map((y) => (y.id === m.id ? { ...y, done: !y.done } : y)) })) })
  })
  // Salud: la sesión del plan de hoy
  const session = d('salud').plan?.[dayIdx]
  if (session && session !== 'Descanso') items.push({ key: 's' + today, area: 'salud', title: session, done: Boolean(d('salud').planDone?.[today]),
    toggle: () => change('salud', (x) => ({ ...x, planDone: { ...x.planDone, [today]: !x.planDone?.[today] } })) })
  // Estudios: entregas de hoy o vencidas
  ;(d('estudios').assignments ?? []).forEach((a) => {
    if (a.due > today || (a.done && a.doneAt !== today)) return
    items.push({ key: 'a' + a.id, area: 'estudios', title: a.course ? `${a.title} · ${a.course}` : a.title, done: a.done, late: !a.done && a.due < today,
      toggle: () => change('estudios', (x) => ({ ...x, assignments: x.assignments.map((y) => (y.id !== a.id ? y : y.done ? { ...y, done: false, doneAt: null } : { ...y, done: true, doneAt: today })) })) })
  })
  // Journal: cada hábito (marcarlo pinta el píxel de hoy)
  ;(d('journal').habits ?? []).forEach((h) => {
    const done = (d('journal').pixels?.[h.id] ?? []).includes(today)
    items.push({ key: 'h' + h.id, area: 'journal', title: h.name, done,
      toggle: () => change('journal', (x) => { const days = x.pixels?.[h.id] ?? []; return { ...x, pixels: { ...x.pixels, [h.id]: days.includes(today) ? days.filter((y) => y !== today) : [...days, today] } } }) })
  })
  // Comida: lo que toca hoy en el menú
  const menuToday = d('comida').menu?.[today] ?? {}
  Object.keys(MEALS).forEach((m) => {
    if (!menuToday[m]) return
    items.push({ key: 'm' + m, area: 'comida', title: `${MEALS[m]}: ${dishName(dishesOf(d('comida')), menuToday[m]).toLowerCase()}`, done: Boolean(d('comida').mealsDone?.[today]?.[m]),
      toggle: () => change('comida', (x) => ({ ...x, mealsDone: { ...x.mealsDone, [today]: { ...x.mealsDone?.[today], [m]: !x.mealsDone?.[today]?.[m] } } })) })
  })

  return { items, reload: load }
}
