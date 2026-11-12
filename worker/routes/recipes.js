// POST /api/recipes  body: { text } (de un PDF) o { image } (data URL de una foto), y lang -> { recipes: [{ name, meals, time, ingredients, steps }] }
// Solo PROPONE: no guarda nada. El usuario revisa y el frontend las guarda.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { MAX_IMAGE, extractRecipes } from '../../server/recipes.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  const body = (await readJson(request)) ?? {}
  const image = typeof body.image === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(body.image) ? body.image : null
  if (body.image && !image) return json({ error: 'Formato de imagen no válido' }, 400)
  if (image && image.length > MAX_IMAGE) return json({ error: 'La foto es demasiado grande' }, 413)
  if (!image && (typeof body.text !== 'string' || body.text.trim().length < 40)) return json({ recipes: [] })
  try {
    return json({ recipes: await extractRecipes({ text: body.text, image, lang: body.lang === 'en' ? 'en' : 'es' }, env) })
  } catch (err) {
    console.error(err)
    // El motivo (código de Groq, modelo…) no lleva secretos y ayuda a saber qué falla
    const why = String(err?.message ?? '').replace(/\s+/g, ' ').slice(0, 180)
    return json({ error: `La IA no ha podido leer las recetas${why ? ` (${why})` : ''}` }, 502)
  }
}
