// POST /api/command   body: { text: "lo que dijo el usuario", today: "2026-11-03" }
// ->  { reply: "...", actions: [{ section: 'gym', title: '...' }] }
//
// El asistente NO guarda nada: solo PROPONE acciones. El frontend las enseña y el usuario confirma.
import { json, readJson, rejectMethod } from '../../server/http.js'
import { getSessionUser } from '../../server/session.js'
import { groqChat } from '../../server/groq.js'
import { SECTIONS } from '../../src/data/sections.js'

const MAX_TEXT_CHARS = 2000
const MAX_ACTIONS = 10
const SECTION_IDS = SECTIONS.map((s) => s.id)

function systemPrompt(today) {
  return `You turn what the user says into entries for their life organizer. Today is ${today}.

Sections (use the id): ${SECTIONS.map((s) => `${s.id} = ${s.label}`).join(', ')}.

Reply ONLY with a JSON object with this exact shape:
{"reply": "one short sentence, plain text", "actions": [{"section": "<id>", "title": "<short entry>"}]}

Rules:
- One action per distinct thing to record. Pick the best matching section.
- title: short and concrete (max 80 chars), include numbers, dates or times the user said. Resolve relative dates ("tomorrow", "next Friday") to real dates.
- Write reply and titles in English, even if the user speaks another language.
- If nothing should be recorded, return "actions": [] and use reply to say why in one sentence.
- No filler words.`
}

/** Se queda solo con acciones válidas: secciones conocidas y títulos razonables. */
function cleanActions(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((a) => SECTION_IDS.includes(a?.section) && typeof a.title === 'string' && a.title.trim())
    .slice(0, MAX_ACTIONS)
    .map((a) => ({ section: a.section, title: a.title.trim().slice(0, 120) }))
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
  if (!user) return json({ error: 'Not signed in' }, 401)

  const body = (await readJson(request)) ?? {}
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return json({ error: 'Missing text' }, 400)
  if (text.length > MAX_TEXT_CHARS) return json({ error: 'Text too long' }, 400)
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10)

  try {
    const raw = await groqChat(
      [
        { role: 'system', content: systemPrompt(today) },
        { role: 'user', content: text },
      ],
      env,
      { json: true, temperature: 0.2 }
    )
    const parsed = parseJson(raw)
    if (!parsed) throw new Error(`Model returned invalid JSON: ${raw.slice(0, 200)}`)
    return json({
      reply: typeof parsed.reply === 'string' ? parsed.reply.slice(0, 300) : '',
      actions: cleanActions(parsed.actions),
    })
  } catch (err) {
    console.error(err)
    return json({ error: 'The assistant failed. Please try again.' }, 502)
  }
}
