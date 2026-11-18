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
import define from './routes/define.js'
import transcribe from './routes/transcribe.js'
import command from './routes/command.js'
import organize from './routes/organize.js'
import ingredients from './routes/ingredients.js'
import recipes from './routes/recipes.js'
import files from './routes/files.js'
import projects from './routes/projects.js'
import tasknotes from './routes/tasknotes.js'

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
  '/api/define': define,
  '/api/transcribe': transcribe,
  '/api/command': command,
  '/api/organize': organize,
  '/api/ingredients': ingredients,
  '/api/recipes': recipes,
  '/api/files': files,
  '/api/projects': projects,
  '/api/tasknotes': tasknotes,
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
    try {
      return await handler({ request, env })
    } catch (e) {
      // Un fallo interno (p. ej. KV lleno o con el límite de escrituras diarias) se devuelve con su motivo, no como una página de error
      const reason = String(e?.message ?? e).slice(0, 200)
      return json({ error: /limit|quota|429/i.test(reason) ? 'Se ha alcanzado el límite de escrituras de la base de datos; vuelve a intentarlo más tarde' : 'Algo ha fallado en el servidor', reason }, 500)
    }
  },
}
