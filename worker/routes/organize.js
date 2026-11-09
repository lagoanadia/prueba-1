// POST /api/organize  body: { subject: "PMDM", docs: [{ id, name, pages, text }], lang }
// -> { units: [{ name, topics: [{ name, docs: [{ id, why, confidence }] }] }], unassigned: [{ id, why }] }
// Solo PROPONE: no guarda nada. El usuario revisa la propuesta y es el frontend quien la crea.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { MAX_DOCS, proposeOrganization } from '../../server/organize.js'

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)

  const body = (await readJson(request)) ?? {}
  const docs = Array.isArray(body.docs) ? body.docs : []
  if (!docs.length) return json({ error: 'No hay documentos' }, 400)
  if (docs.length > MAX_DOCS) return json({ error: `Máximo ${MAX_DOCS} documentos a la vez` }, 400)
  try {
    return json(await proposeOrganization({ subject: body.subject, docs, lang: body.lang === 'en' ? 'en' : 'es' }, env))
  } catch (err) {
    console.error(err)
    return json({ error: 'La IA no ha podido proponer la organización. Inténtalo otra vez.' }, 502)
  }
}
