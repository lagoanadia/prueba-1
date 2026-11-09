// POST /api/command   body: { text: "lo que dijo el usuario", today: "2026-11-05" }
// ->  { reply: "Apunto ... ¿Lo confirmo?", actions: [{ area, title, date, time, done }] }
//
// El asistente NO guarda nada: solo PROPONE. El usuario confirma (botón o diciendo "sí")
// y entonces el frontend llama a POST /api/entries.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { groqChat } from '../../server/groq.js'
import { cleanAction } from '../../server/entries.js'
import { AREAS } from '../../src/data/areas.js'

const MAX_TEXT_CHARS = 2000
const MAX_ACTIONS = 10

function systemPrompt(today, lang = 'es') {
  const weekday = new Date(`${today}T12:00:00Z`).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' })
  const english = lang === 'en' ? '\nIMPORTANTE: el usuario habla en inglés. Escribe title y reply en inglés; la frase de reply termina con "Shall I save it?".' : ''
  return `Conviertes lo que dice el usuario en entradas de su organizador personal. Hoy es ${weekday} ${today}.

Áreas (usa el id): ${AREAS.map((a) => `${a.id} = ${a.label}`).join(', ')}.
- estudios: clases, exámenes, entregas, apuntes.
- salud: gimnasio, deporte, ejercicios, médico, sueño.
- journal: hábitos, reflexiones, estado de ánimo, lectura.
- trabajo: tareas y reuniones de trabajo o proyectos.
- comida: menús, recetas, batch cooking, lista de la compra.

Responde SOLO con un objeto JSON con esta forma exacta:
{"reply": "...", "actions": [{"area": "<id>", "title": "...", "date": "YYYY-MM-DD" | null, "time": "HH:MM" | null, "done": true | false}]}

Reglas:
- Una acción por cada cosa distinta. Elige el área que mejor encaje.
- title: corto y concreto (máx. 80 caracteres), en español, con los números que diga el usuario.
- date: resuelve fechas relativas ("hoy", "mañana", "el viernes") a fechas reales. Si es algo de hoy o algo que ya ha hecho hoy, usa ${today}. Si no hay fecha, null.
- time: solo si dice una hora concreta.
- done: true si cuenta algo que YA ha hecho ("hoy he hecho...", "he leído..."); false si es algo pendiente.
- reply: una sola frase en español que resuma lo que vas a apuntar y termine con "¿Lo confirmo?". Ejemplo: "Apunto la sesión de pierna para hoy. ¿Lo confirmo?"
- Si no hay nada que apuntar, "actions": [] y en reply explica por qué en una frase.
- Sin muletillas ni saludos.${english}`
}

/** Por si el modelo envuelve el JSON en texto: nos quedamos con lo que hay entre la primera { y la última }. */
function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
  }
}

export default async function handler({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed

  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'No has iniciado sesión' }, 401)

  const body = (await readJson(request)) ?? {}
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return json({ error: 'Falta el texto' }, 400)
  if (text.length > MAX_TEXT_CHARS) return json({ error: 'Texto demasiado largo' }, 400)
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10)

  try {
    const raw = await groqChat(
      [
        { role: 'system', content: systemPrompt(today, body.lang === 'en' ? 'en' : 'es') },
        { role: 'user', content: text },
      ],
      env,
      { json: true, temperature: 0.2 }
    )
    const parsed = parseJson(raw)
    if (!parsed) throw new Error(`Model returned invalid JSON: ${raw.slice(0, 200)}`)
    const actions = (Array.isArray(parsed.actions) ? parsed.actions : []).slice(0, MAX_ACTIONS).map(cleanAction).filter(Boolean)
    return json({ reply: typeof parsed.reply === 'string' ? parsed.reply.slice(0, 300) : '', actions })
  } catch (err) {
    console.error(err)
    return json({ error: 'El asistente ha fallado. Inténtalo otra vez.' }, 502)
  }
}
