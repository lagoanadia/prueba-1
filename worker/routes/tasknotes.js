// POST /api/tasknotes  body: { project, milestone, notes, lang } -> { tasks: ["...", ...] }
// Solo PROPONE: no guarda nada. El frontend enseña la lista y el usuario elige qué añadir.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { MAX_NOTES, proposeTasks } from '../../server/tasknotes.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  const body = (await readJson(request)) ?? {}
  if (typeof body.notes !== 'string' || !body.notes.trim()) return json({ error: 'Escribe algo primero' }, 400)
  if (body.notes.length > MAX_NOTES) return json({ error: 'Demasiado texto' }, 400)
  try {
    return json(await proposeTasks({ project: body.project, milestone: body.milestone, notes: body.notes, lang: body.lang === 'en' ? 'en' : 'es' }, env))
  } catch (err) {
    console.error(err)
    return json({ error: 'La IA no ha podido ordenar las notas. Inténtalo otra vez.' }, 502)
  }
}
