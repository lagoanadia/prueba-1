// POST /api/ingredients  body: { dish: "Curry...", have: ["Cebolla"], lang } -> { suggestions: ["Ajo", ...] }
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { classifySpices, suggestIngredients } from '../../server/ingredients.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  const body = (await readJson(request)) ?? {}
  // Clasificar nombres sueltos: ¿cuáles son especias?
  if (Array.isArray(body.classify)) {
    try { return json({ spices: await classifySpices({ names: body.classify.filter((x) => typeof x === 'string'), lang: body.lang === 'en' ? 'en' : 'es' }, env) }) } catch (err) { console.error(err); return json({ spices: [] }) }
  }
  if (typeof body.dish !== 'string' || !body.dish.trim()) return json({ suggestions: [], spices: [] })
  try {
    return json(await suggestIngredients({ dish: body.dish, have: Array.isArray(body.have) ? body.have : [], lang: body.lang === 'en' ? 'en' : 'es' }, env))
  } catch (err) {
    console.error(err)
    // Sin IA el usuario sigue escribiendo a mano, pero se le dice por qué no hay ideas
    const reason = /GROQ_API_KEY is not set/.test(String(err?.message)) ? 'nokey' : err?.status === 401 ? 'badkey' : err?.status === 429 ? 'quota' : 'ia'
    return json({ suggestions: [], spices: [], reason })
  }
}
