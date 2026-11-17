// /api/social
//   GET  ?today=YYYY-MM-DD            -> { me, friends, feed (último mes), challenges, gifts }
//   GET  ?posts=<usuario>             -> { posts } todo lo que esa persona ha publicado (su perfil)
//   POST { action, ... , today }      -> publicar, reaccionar, comentar, retos, edificio, regalos, sesiones…
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { act, friendPosts, socialState } from '../../server/social.js'

const ISO = /^\d{4}-\d{2}-\d{2}$/
const todayOf = (v) => (ISO.test(v ?? '') ? v : new Date().toISOString().slice(0, 10))

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  if (request.method === 'GET') {
    const q = new URL(request.url).searchParams
    if (q.get('posts')) return json(await friendPosts(env, user.id, q.get('posts'))) // GET ?posts=<usuario>: todo lo que ha publicado esa persona
    return json(await socialState(env, user.id, todayOf(q.get('today'))))
  }
  const body = await readJson(request)
  const res = await act(env, user.id, body, todayOf(body?.today))
  return res.error ? json(res, 400) : json(res)
}
