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
    subjects: (estudios.subjects ?? []).map((s) => ({ key: s.short, alt: [s.name], short: s.short, name: s.name })),
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
- Asignaturas (sigla = nombre): ${list(ctx.subjects.map((s) => `${s.short} = ${s.name}`))}
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
export async function placeActions(env, uid, actions, today) {
  const ctx = await userContext(env, uid)
  const boards = {}
  const load = async (a) => (boards[a] ??= await getBoard(env, uid, a))
  const placed = []
  const rest = []
  for (const a of actions) {
    if (a.kind === 'assignment' || (a.area === 'estudios' && a.course)) {
      const s = closest(a.course ?? a.title, ctx.subjects)
      if (s) {
        const b = await load('estudios')
        b.data.assignments = [...(b.data.assignments ?? []), { id: crypto.randomUUID(), title: a.title, course: s.short, due: a.date ?? today, done: a.done, ...(a.done ? { doneAt: today } : {}) }]
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
  for (const [area, b] of Object.entries(boards)) await saveBoard(env, uid, area, { layout: b.layout ?? [], data: b.data })
  return { rest, placed }
}
