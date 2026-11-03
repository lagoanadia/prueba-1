// POST /api/chat
// body: { messages: [{ role: 'user'|'assistant', content }], material?: { type, name, text } }
// ->    { reply: "<respuesta del asistente>" }
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { groqChat } from '../../server/groq.js'
import { ORGANIZER_SYSTEM_PROMPT, materialToContext } from '../../server/prompts.js'

// Límites para que nadie nos mande 10 MB de texto y nos funda la cuota de Groq.
const MAX_MESSAGES = 30
const MAX_MESSAGE_CHARS = 4000
const MAX_MATERIAL_CHARS = 20000

/** Devuelve un texto de error si el body no es válido, o null si está bien. */
function validate(messages, material) {
  if (!Array.isArray(messages) || messages.length === 0) return 'messages must be a non-empty array'
  if (messages.length > MAX_MESSAGES) return `Too many messages (max ${MAX_MESSAGES})`
  for (const m of messages) {
    // Solo aceptamos 'user' y 'assistant': si dejáramos 'system', el cliente
    // podría reescribir las reglas del asistente.
    if (!['user', 'assistant'].includes(m?.role)) return 'Invalid message role'
    if (typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS) return 'Invalid message content'
  }
  if (material != null) {
    if (typeof material.type !== 'string' || typeof material.name !== 'string') return 'Invalid material'
    if (material.text != null && (typeof material.text !== 'string' || material.text.length > MAX_MATERIAL_CHARS)) {
      return `Material text is too long (max ${MAX_MATERIAL_CHARS} characters)`
    }
  }
  return null
}

export async function onRequest({ request, env }) {
  const notAllowed = rejectMethod(request, ['POST'])
  if (notAllowed) return notAllowed

  // 1. ¿Está logueado? Sin esto, cualquiera podría usar nuestra API key gratis.
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'Not signed in' }, 401)

  // 2. ¿El body es válido?
  const { messages, material } = (await readJson(request)) ?? {}
  const error = validate(messages, material)
  if (error) return json({ error }, 400)

  // 3. Construir la conversación: reglas + material + historial del chat.
  const groqMessages = [
    { role: 'system', content: ORGANIZER_SYSTEM_PROMPT },
    ...(material ? [{ role: 'system', content: materialToContext(material) }] : []),
    ...messages.map(({ role, content }) => ({ role, content })),
  ]

  // 4. Llamar a Groq.
  try {
    const reply = await groqChat(groqMessages, env)
    return json({ reply })
  } catch (err) {
    console.error(err) // se ve en los logs de Cloudflare; al cliente no le damos detalles internos
    return json({ error: 'The AI service failed. Please try again.' }, 502)
  }
}
