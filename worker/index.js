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
import transcribe from './routes/transcribe.js'
import command from './routes/command.js'

const ROUTES = {
  '/api/auth/google': google,
  '/api/auth/me': me,
  '/api/auth/logout': logout,
  '/api/entries': entries,
  '/api/board': board,
  '/api/transcribe': transcribe,
  '/api/command': command,
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    const handler = ROUTES[pathname]
    if (!handler) return json({ error: 'Not found' }, 404)
    return handler({ request, env })
  },
}
