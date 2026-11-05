// /api/board?area=journal
//   GET                        -> { layout, data }   (layout null = el usuario aún no lo ha personalizado)
//   PUT  { layout, data }      -> { ok: true }
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { getBoard, saveBoard, validateBoard, isArea } from '../../server/boards.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'PUT'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  const area = new URL(request.url).searchParams.get('area')
  if (!isArea(area)) return json({ error: 'Área desconocida' }, 400)

  if (request.method === 'GET') return json(await getBoard(env, user.id, area))

  const board = await readJson(request)
  const error = validateBoard(board)
  if (error) return json({ error }, 400)
  await saveBoard(env, user.id, area, board)
  return json({ ok: true })
}
