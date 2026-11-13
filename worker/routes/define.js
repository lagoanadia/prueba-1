// GET /api/define?word=masca&lang=es|en  -> { word, definition } (una frase corta; definition = null si no se encuentra)
import { json, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { defineWord } from '../../server/define.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  const q = new URL(request.url).searchParams
  const word = q.get('word') ?? ''
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30}$/.test(word)) return json({ error: 'Palabra no válida' }, 400)
  return json(await defineWord(env, word, q.get('lang') === 'en' ? 'en' : 'es'))
}
