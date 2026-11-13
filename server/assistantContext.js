// Lo que el asistente necesita saber de TI para entenderte bien y apuntar cada cosa en su sitio:
// tus asignaturas, proyectos, hábitos, platos y deportes (sacados de tus tableros).
import { getBoard, saveBoard } from './boards.js'

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

/** Distancia de edición (para «Uotori» → «Yutori»). */
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
/** El nombre conocido más parecido (o null si ninguno se parece de verdad). */
export function closest(name, options) {
  const n = norm(name)
  if (!n) return null
  let best = null
  let score = Infinity
  for (const o of options) {
    for (const k of [o.key, ...(o.alt ?? [])]) {
      const m = norm(k)
      if (!m) continue
      const s = m === n ? 0 : m.includes(n) || n.includes(m) ? 0.5 : distance(m, n) / Math.max(m.length, n.length)
      if (s < score) { score = s; best = o }
    }
  }
  return score <= 0.34 ? best : null
}

export async function userContext(env, uid) {
  const [estudios, trabajo, journal, comida, salud] = await Promise.all(['estudios', 'trabajo', 'journal', 'comida', 'salud'].map((a) => getBoard(env, uid, a).then((b) => b.data ?? {})))
  return {
    subjects: (estudios.subjects ?? []).map((s) => ({ key: s.short, alt: [s.name], id: s.id, short: s.short, name: s.name, units: (s.units ?? []).map((u) => ({ key: u.name, id: u.id, name: u.name })) })),
    projects: (trabajo.projects ?? []).map((p) => ({ key: p.name, id: p.id, name: p.name })),
    habits: (journal.habits ?? []).map((h) => h.name),
    dishes: (comida.dishes ?? []).map((d) => d.name),
    sports: salud.sports ?? [],
  }
}

/** Palabras para el reconocimiento de voz (así escribe bien «Yutori» o «Sistemas de Gestión Empresarial»). */
export function vocabulary(ctx) {
  const words = [...ctx.subjects.flatMap((s) => [s.short, s.name]), ...ctx.projects.map((p) => p.name), ...ctx.habits, ...ctx.dishes, ...ctx.sports]
  return [...new Set(words.filter(Boolean))].join(', ').slice(0, 600)
}

/** Texto para el prompt del asistente con tus cosas reales. */
export function contextPrompt(ctx) {
  const list = (xs) => (xs.length ? xs.join('; ') : '(ninguno)')
  return `Lo que ya tiene el usuario (úsalo tal cual; si lo que dice se parece a uno de estos nombres, es ese — corrige la transcripción):
- Asignaturas (sigla = nombre [unidades]): ${list(ctx.subjects.map((s) => `${s.short} = ${s.name}${s.units?.length ? ` [${s.units.map((u) => u.name).join(', ')}]` : ''}`))}
- Proyectos de trabajo: ${list(ctx.projects.map((p) => p.name))}
- Hábitos: ${list(ctx.habits)}
- Platos: ${list(ctx.dishes)}
- Deportes: ${list(ctx.sports)}`
}

/**
 * Coloca cada acción confirmada en su sitio de verdad:
 * - entrega/examen de una asignatura → Estudios › Entregas
 * - tarea de un proyecto → su tablero en Trabajo
 * - reunión con hora → Agenda de Trabajo
 * Lo que no encaja en ningún sitio se queda como nota de voz. Devuelve { rest, placed }.
 */
const SUBJECT_PALETTE = ['#2F6FED', '#E5383B', '#1FA463', '#8B5CF6', '#F97316', '#EAB308', '#EC4899', '#06B6D4', '#92400E', '#64748B']
const PROJECT_COLORS = ['#E84855', '#3185FC', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF']
const HABIT_COLORS = ['#3185FC', '#EFABFF', '#F9DC5C', '#3DDC97', '#E84855']
const has = (list, name) => list.some((x) => norm(x) === norm(name))
/** Sigla a partir del nombre: «Sistemas Operativos» → «SO»; una palabra → sus primeras letras. */
const sigla = (name) => {
  const words = String(name).split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w))
  const s = words.length > 1 ? words.map((w) => w[0]).join('') : String(name).slice(0, 4)
  return s.toUpperCase().slice(0, 14)
}
/** Día de la semana (lunes = 0) de una fecha YYYY-MM-DD. */
const weekday = (iso) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7

export async function placeActions(env, uid, actions, today) {
  const ctx = await userContext(env, uid)
  const boards = {}
  const load = async (a) => (boards[a] ??= await getBoard(env, uid, a))
  const placed = []
  const rest = []
  for (const a of actions) {
    // ---- Estructura: crear asignaturas, unidades, temas, proyectos, hábitos, deportes… ----
    if (a.kind === 'subject') {
      const b = await load('estudios')
      const list = b.data.subjects ?? []
      const short = (a.course ?? sigla(a.title)).toUpperCase().slice(0, 14)
      if (!closest(short, ctx.subjects) && !closest(a.title, ctx.subjects)) {
        const subj = { id: crypto.randomUUID(), short, name: a.title, color: SUBJECT_PALETTE[list.length % SUBJECT_PALETTE.length], units: [{ id: crypto.randomUUID(), name: 'Bloque 1', topics: [] }] }
        b.data.subjects = [...list, subj]
        ctx.subjects.push({ key: short, alt: [a.title], id: subj.id, short, name: a.title, units: [{ key: 'Bloque 1', id: subj.units[0].id, name: 'Bloque 1' }] })
      }
      placed.push({ area: 'estudios', where: 'Asignaturas', title: a.title }); continue
    }
    if (a.kind === 'unit' || a.kind === 'topic') {
      const s = closest(a.course ?? '', ctx.subjects)
      if (s) {
        const b = await load('estudios')
        if (a.kind === 'unit') {
          const unit = { id: crypto.randomUUID(), name: a.title, topics: [] }
          b.data.subjects = b.data.subjects.map((x) => (x.id === s.id ? { ...x, units: [...(x.units ?? []), unit] } : x))
          s.units.push({ key: unit.name, id: unit.id, name: unit.name })
        } else {
          const u = (a.unit && closest(a.unit, s.units)) || s.units[s.units.length - 1]
          b.data.subjects = b.data.subjects.map((x) => {
            if (x.id !== s.id) return x
            const topic = { id: crypto.randomUUID(), name: a.title, state: 'todo' }
            if (!u) return { ...x, units: [{ id: crypto.randomUUID(), name: 'Bloque 1', topics: [topic] }] }
            return { ...x, units: x.units.map((y) => (y.id === u.id ? { ...y, topics: [...(y.topics ?? []), topic] } : y)) }
          })
        }
        placed.push({ area: 'estudios', where: s.short, title: a.title }); continue
      }
    }
    if (a.kind === 'project') {
      const b = await load('trabajo')
      const list = b.data.projects ?? []
      if (!closest(a.title, ctx.projects)) {
        const proj = { id: crypto.randomUUID(), name: a.title, createdAt: today, color: PROJECT_COLORS[list.length % PROJECT_COLORS.length], deadline: a.date, tasks: [] }
        b.data.projects = [...list, proj]
        ctx.projects.push({ key: proj.name, id: proj.id, name: proj.name })
      }
      placed.push({ area: 'trabajo', where: 'Proyectos', title: a.title }); continue
    }
    if (a.kind === 'habit') {
      const b = await load('journal')
      const list = b.data.habits ?? []
      if (!has(list.map((h) => h.name), a.title)) b.data.habits = [...list, { id: crypto.randomUUID(), name: a.title, color: HABIT_COLORS[list.length % HABIT_COLORS.length] }]
      placed.push({ area: 'journal', where: 'Hábitos', title: a.title }); continue
    }
    if (a.kind === 'sport' || a.kind === 'session') {
      const b = await load('salud')
      const sports = b.data.sports ?? []
      const known = sports.find((x) => norm(x) === norm(a.title)) ?? a.title
      if (!has(sports, known)) b.data.sports = [...sports, known]
      if (a.kind === 'session') {
        b.data.planSessions = [...(b.data.planSessions ?? []), { id: crypto.randomUUID(), done: {}, sport: known, day: weekday(a.date ?? today), start: a.time ?? '18:00', min: a.minutes ?? 60 }]
        placed.push({ area: 'salud', where: 'Plan semanal', title: known }); continue
      }
      placed.push({ area: 'salud', where: 'Deportes', title: known }); continue
    }
    if (a.kind === 'shopping') {
      const b = await load('comida')
      const items = b.data.shop?.items ?? []
      if (!has(items.map((i) => i.text), a.title)) b.data.shop = { ...(b.data.shop ?? {}), items: [...items, { id: crypto.randomUUID(), text: a.title, done: false }] }
      placed.push({ area: 'comida', where: 'Lista de la compra', title: a.title }); continue
    }
    if (a.kind === 'assignment' || (a.area === 'estudios' && a.course)) {
      const s = closest(a.course ?? a.title, ctx.subjects)
      if (s) {
        const b = await load('estudios')
        b.data.assignments = [...(b.data.assignments ?? []), { id: crypto.randomUUID(), title: a.title, course: s.short, kind: a.type ?? 'practica', due: a.date ?? today, done: a.done, ...(a.done ? { doneAt: today } : {}) }]
        placed.push({ area: 'estudios', where: s.short, title: a.title }); continue
      }
    }
    if (a.kind === 'task' || (a.area === 'trabajo' && a.project && a.kind !== 'meeting')) {
      const p = closest(a.project ?? '', ctx.projects)
      if (p) {
        const b = await load('trabajo')
        b.data.projects = (b.data.projects ?? []).map((x) => (x.id !== p.id ? x : { ...x, tasks: [...(x.tasks ?? []), { id: crypto.randomUUID(), title: a.title, priority: 'media', due: a.date, status: a.done ? 'done' : 'todo', ...(a.done ? { doneAt: today } : {}) }] }))
        placed.push({ area: 'trabajo', where: p.name, title: a.title }); continue
      }
    }
    if (a.kind === 'meeting' && a.date && a.time) {
      const b = await load('trabajo')
      const [h, m] = a.time.split(':').map(Number)
      const end = h * 60 + m + 60
      const p = a.project ? closest(a.project, ctx.projects) : null
      b.data.meetings = [...(b.data.meetings ?? []), { id: crypto.randomUUID(), date: a.date, start: a.time, end: `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`, title: a.title, projectId: p?.id ?? null }]
      placed.push({ area: 'trabajo', where: 'Agenda', title: a.title }); continue
    }
    rest.push(a)
  }
  for (const [area, b] of Object.entries(boards)) await saveBoard(env, uid, area, { layout: b.layout ?? null, data: b.data }) // null = tablero sin personalizar (se usan los widgets por defecto)
  return { rest, placed }
}
