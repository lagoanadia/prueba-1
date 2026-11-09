/*
 * TODO LO QUE TIENE FECHA, de todas las áreas, como "elementos de calendario":
 *   { key, date, title, type: 'tarea'|'evento'|'cumpleaños'|'entrega', area|null, done, toggle?, remove? }
 */
import { addDays } from './dates.js'
import { MEALS, OUT } from '../widgets/comida/food.js'

export const TYPES = {
  tarea: { label: 'Tarea', glyph: '☑' },
  cumpleaños: { label: 'Cumpleaños', glyph: '✦' },
  evento: { label: 'Evento', glyph: '◆' },
  entrega: { label: 'Entrega', glyph: '➤' },
}

export function calendarItems({ boards, change, entries, toggleEntry, from, to }) {
  const items = []
  const d = (a) => boards[a]?.data ?? {}
  const inRange = (date) => date && date >= from && date <= to

  // Eventos y cumpleaños propios (los cumpleaños se repiten cada año)
  ;(d('calendario').events ?? []).forEach((ev) => {
    const dates = ev.type === 'cumpleaños'
      ? [Number(from.slice(0, 4)), Number(to.slice(0, 4))].map((y) => `${y}${ev.date.slice(4)}`)
      : [ev.date]
    ;[...new Set(dates)].filter(inRange).forEach((date) => items.push({
      key: ev.id + date, date, title: ev.title, type: ev.type, area: ev.area ?? null, done: Boolean(ev.done),
      toggle: ev.type === 'cumpleaños' ? null : () => change('calendario', (x) => ({ ...x, events: x.events.map((e) => (e.id === ev.id ? { ...e, done: !e.done } : e)) })),
      remove: () => change('calendario', (x) => ({ ...x, events: x.events.filter((e) => e.id !== ev.id) })),
    }))
  })
  // Tareas apuntadas por voz
  entries.filter((e) => inRange(e.date)).forEach((e) => items.push({ key: 'e' + e.id, date: e.date, title: e.title, type: 'tarea', area: e.area, done: e.done, toggle: () => toggleEntry(e.id, !e.done) }))
  // Trabajo: tareas con fecha y fechas límite de proyectos
  ;(d('trabajo').projects ?? []).forEach((p) => {
    if (inRange(p.deadline)) items.push({ key: 'p' + p.id, date: p.deadline, title: p.name, type: 'entrega', area: 'trabajo', done: false })
    p.tasks.filter((t) => inRange(t.due)).forEach((t) => items.push({
      key: 't' + t.id, date: t.due, title: t.title, type: 'tarea', area: 'trabajo', done: t.status === 'done',
      toggle: () => change('trabajo', (x) => ({ ...x, projects: x.projects.map((pp) => (pp.id !== p.id ? pp : { ...pp, tasks: pp.tasks.map((tt) => (tt.id !== t.id ? tt : { ...tt, status: tt.status === 'done' ? 'todo' : 'done', doneAt: tt.status === 'done' ? null : t.due })) })) })),
    }))
  })
  // Estudios: entregas
  ;(d('estudios').assignments ?? []).filter((a) => inRange(a.due)).forEach((a) => items.push({
    key: 'a' + a.id, date: a.due, title: a.course ? `${a.title} · ${a.course}` : a.title, type: 'entrega', area: 'estudios', done: a.done,
    toggle: () => change('estudios', (x) => ({ ...x, assignments: x.assignments.map((y) => (y.id !== a.id ? y : { ...y, done: !y.done, doneAt: y.done ? null : a.due })) })),
  }))
  // Salud: el plan semanal, repetido en cada semana del rango
  const plan = d('salud').plan
  if (plan) {
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const s = plan[(new Date(`${date}T12:00:00`).getDay() + 6) % 7]
      if (s && s !== 'Descanso') items.push({
        key: 's' + date, date, title: s, type: 'evento', area: 'salud', done: Boolean(d('salud').planDone?.[date]),
        toggle: () => change('salud', (x) => ({ ...x, planDone: { ...x.planDone, [date]: !x.planDone?.[date] } })),
      })
    }
  }
  // Comida: las comidas fuera de casa
  Object.entries(d('comida').menu ?? {}).filter(([date]) => inRange(date)).forEach(([date, meals]) => {
    Object.entries(meals ?? {}).filter(([, v]) => v === OUT).forEach(([m]) => items.push({ key: `c${date}${m}`, date, title: `${MEALS[m]} fuera`, type: 'evento', area: 'comida', done: false }))
  })
  return items
}
