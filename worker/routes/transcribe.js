// POST /api/transcribe   body: el audio en crudo (Content-Type: audio/webm, audio/mp4...)
// ->  { text: "lo que has dicho" }
import { json, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { groqTranscribe } from '../../server/groq.js'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB: de sobra para un mensaje de voz

// Groq deduce el formato por la extensión del archivo.
const EXTENSIONS = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)

  const type = (request.headers.get('Content-Type') ?? '').split(';')[0].trim()
  const ext = EXTENSIONS[type]
  if (!ext) return json({ error: `Unsupported audio type: ${type || 'none'}` }, 415)

  const audio = await request.blob()
  if (audio.size === 0) return json({ error: 'La grabación está vacía' }, 400)
  if (audio.size > MAX_BYTES) return json({ error: 'La grabación es demasiado larga' }, 413)

  try {
    const text = await groqTranscribe(audio, env, `voice.${ext}`, request.headers.get('X-Lang') === 'en' ? 'en' : 'es')
    return json({ text })
  } catch (err) {
    console.error(err)
    return json({ error: 'No he podido transcribir el audio. Inténtalo otra vez.' }, 502)
  }
}
