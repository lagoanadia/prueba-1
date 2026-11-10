// POST /api/ingredients  body: { dish: "Curry...", have: ["Cebolla"], lang } -> { suggestions: ["Ajo", ...] }
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { suggestIngredients } from '../../server/ingredients.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  const body = (await readJson(request)) ?? {}
  if (typeof body.dish !== 'string' || !body.dish.trim()) return json({ suggestions: [] })
  try {
    return json({ suggestions: await suggestIngredients({ dish: body.dish, have: Array.isArray(body.have) ? body.have : [], lang: body.lang === 'en' ? 'en' : 'es' }, env) })
  } catch (err) {
    console.error(err)
    return json({ suggestions: [] }) // sin IA el usuario sigue escribiendo a mano
  }
}
