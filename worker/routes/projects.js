// /api/projects  (proyectos de Trabajo compartidos con amigos)
//   GET                                              -> { projects: [...] }
//   POST { action: 'create', project, members }      -> { project }
//   PUT  { id, base, project }                       -> { rev, project }   (guarda cambios; fusiona si otro guardó antes)
//   POST { action: 'version', id, note }             -> guarda una versión
//   POST { action: 'restore', id, n }                -> vuelve a la versión n
//   POST { action: 'invite', id, members }           -> invita amigos
//   POST { action: 'leave', id }                     -> sales del proyecto
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { createProject, invite, leaveProject, listProjects, restoreVersion, saveProject, saveVersion } from '../../server/projects.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['GET', 'POST', 'PUT'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)
  if (!env.DATA) return json({ error: 'Server misconfigured: missing DATA (KV)' }, 500)

  if (request.method === 'GET') return json({ projects: await listProjects(env, user.id) })
  const body = await readJson(request)
  if (!body) return json({ error: 'Petición no válida' }, 400)
  const id = String(body.id ?? '')
  const answer = (r) => (r.error ? json({ error: r.error }, r.status ?? 400) : json(r))

  if (request.method === 'PUT') return answer(await saveProject(env, user.id, id, body))
  switch (body.action) {
    case 'create': return answer(await createProject(env, user.id, body))
    case 'version': return answer(await saveVersion(env, user.id, id, body.note))
    case 'restore': return answer(await restoreVersion(env, user.id, id, body.n))
    case 'invite': return answer(await invite(env, user.id, id, body.members))
    case 'leave': return answer(await leaveProject(env, user.id, id))
    default: return json({ error: 'Acción no válida' }, 400)
  }
}
