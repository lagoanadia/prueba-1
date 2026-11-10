// POST /api/recipes  body: { text, lang } -> { recipes: [{ name, meals, time, ingredients, steps }] }
// Solo PROPONE: no guarda nada. El usuario revisa y el frontend las guarda.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { extractRecipes } from '../../server/recipes.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  const body = (await readJson(request)) ?? {}
  if (typeof body.text !== 'string' || body.text.trim().length < 40) return json({ recipes: [] })
  try {
    return json({ recipes: await extractRecipes({ text: body.text, lang: body.lang === 'en' ? 'en' : 'es' }, env) })
  } catch (err) {
    console.error(err)
    return json({ error: 'La IA no ha podido leer las recetas. Inténtalo otra vez.' }, 502)
  }
}
