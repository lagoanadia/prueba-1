/*
 * PUNTO DE ENTRADA DEL WORKER (backend en Cloudflare Workers)
 *
 * Cloudflare llama a fetch() con cada petición que empieza por /api/
 * (lo decide "run_worker_first" en wrangler.jsonc). El resto de URLs
 * (/, /assets/...) las sirve Cloudflare directamente desde dist/ sin pasar por aquí.
 *
 * Aquí hacemos de "router": miramos la ruta y llamamos al handler que toca.
 */
import { json } from '../server/http.js'
import google from './routes/google.js'
import me from './routes/me.js'
import logout from './routes/logout.js'
import entries from './routes/entries.js'
import board from './routes/board.js'
import profile from './routes/profile.js'
import friends from './routes/friends.js'
import shares from './routes/shares.js'
import social from './routes/social.js'
import games from './routes/games.js'
import transcribe from './routes/transcribe.js'
import command from './routes/command.js'
import organize from './routes/organize.js'

const ROUTES = {
  '/api/auth/google': google,
  '/api/auth/me': me,
  '/api/auth/logout': logout,
  '/api/entries': entries,
  '/api/board': board,
  '/api/profile': profile,
  '/api/friends': friends,
  '/api/shares': shares,
  '/api/social': social,
  '/api/games': games,
  '/api/transcribe': transcribe,
  '/api/command': command,
  '/api/organize': organize,
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    // Archivos del frontend: si no existe (p. ej. de un deploy anterior), 404 de verdad en vez de la página,
    // así el navegador se da cuenta y la app se recarga sola con la versión nueva.
    if (pathname.startsWith('/assets/')) {
      const res = await env.ASSETS.fetch(request)
      if ((res.headers.get('content-type') ?? '').includes('text/html')) return new Response('Not found', { status: 404 })
      return res
    }
    const handler = ROUTES[pathname]
    if (!handler) return json({ error: 'Not found' }, 404)
    return handler({ request, env })
  },
}
