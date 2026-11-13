// Convierte notas sueltas de un hito en tareas cortas y ordenadas. Solo PROPONE: el usuario decide cuáles se añaden.
import { groqChat } from './groq.js'

export const MAX_NOTES = 4000
const clean = (s, n) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '')

const systemPrompt = (lang) => lang === 'en'
  ? `You turn rough notes about a project milestone into a short, ordered list of tasks.
Reply ONLY with JSON: {"tasks":["..."]}.
Rules: 2 to 12 tasks; each starts with a verb, is concrete and at most 70 characters; merge duplicates; keep a natural order of work; do not invent anything that is not in the notes; write in English.`
  : `Conviertes notas sueltas sobre un hito de un proyecto en una lista corta y ordenada de tareas.
Responde SOLO con JSON: {"tasks":["..."]}.
Reglas: de 2 a 12 tareas; cada una empieza con un verbo, es concreta y de máximo 70 caracteres; junta lo repetido; ordénalas como se haría el trabajo; no inventes nada que no esté en las notas; escribe en español.`

function parseJson(text) {
  try { return JSON.parse(text) } catch {
    const a = text.indexOf('{'); const b = text.lastIndexOf('}')
    if (a === -1 || b <= a) return null
    try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
  }
}

export async function proposeTasks({ project, milestone, notes, lang }, env) {
  const text = clean(notes, MAX_NOTES)
  const user = `${lang === 'en' ? 'Project' : 'Proyecto'}: ${clean(project, 80) || '—'}\n${lang === 'en' ? 'Milestone' : 'Hito'}: ${clean(milestone, 80) || '—'}\n\n${lang === 'en' ? 'Notes' : 'Notas'}:\n${text}`
  const raw = await groqChat([{ role: 'system', content: systemPrompt(lang) }, { role: 'user', content: user }], env, { json: true, temperature: 0.2, maxTokens: 1024 })
  const parsed = parseJson(raw)
  const tasks = (Array.isArray(parsed?.tasks) ? parsed.tasks : []).map((t) => clean(typeof t === 'string' ? t : t?.title, 90)).filter(Boolean).slice(0, 12)
  if (!tasks.length) throw new Error('Model returned no tasks')
  return { tasks }
}
