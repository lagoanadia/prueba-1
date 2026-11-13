// GET  /api/games?game=bee|crossword&lang=es|en&date=YYYY-MM-DD  -> el reto del día (igual para todos)
// POST /api/games?game=bee&lang=…&date=…  { word }                 -> { word, valid } (palabra que no estaba en la lista)
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { checkBeeWord, dailyGame, isGame } from '../../server/games.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)
  const q = new URL(request.url).searchParams
  const game = q.get('game')
  const lang = q.get('lang') === 'en' ? 'en' : 'es'
  const server = new Date().toISOString().slice(0, 10)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q.get('date') ?? '') ? q.get('date') : server
  if (!isGame(game)) return json({ error: 'Juego no válido' }, 400)
  // Solo hoy (± un día por la zona horaria): no se pueden pedir retos de otros días
  const d = (iso) => Date.parse(`${iso}T12:00:00Z`)
  if (Math.abs(d(date) - d(server)) > 864e5 * 1.5) return json({ error: 'Solo el reto de hoy' }, 400)
  if (request.method === 'POST') {
    if (game !== 'bee') return json({ error: 'Juego no válido' }, 400)
    const word = String((await readJson(request))?.word ?? '').slice(0, 30)
    try {
      return json(await checkBeeWord(env, lang, date, word))
    } catch (e) {
      console.error(e)
      return json({ error: 'No se ha podido comprobar la palabra' }, 502)
    }
  }
  try {
    return json(await dailyGame(env, game, lang, date))
  } catch (e) {
    console.error(e)
    return json({ error: 'No se ha podido preparar el juego de hoy. Inténtalo en un rato.' }, 502)
  }
}
