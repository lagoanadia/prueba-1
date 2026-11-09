// Organizar los documentos de una asignatura: el modelo propone unidades y temas y coloca cada documento en un tema.
import { groqChat } from './groq.js'

export const MAX_DOCS = 40
const MAX_NAME = 120
const MAX_TEXT = 2000
const clean = (s, n) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '')

function systemPrompt(lang) {
  const en = lang === 'en'
  return `${en ? 'You organize the study documents of ONE school subject' : 'Organizas los documentos de estudio de UNA asignatura'}.
${en ? 'You receive a list of documents (id, file name, number of pages and the beginning of their text).' : 'Recibes una lista de documentos (id, nombre de archivo, número de páginas y el principio de su texto).'}
${en ? 'Propose how to organize them into UNITS and TOPICS and place EVERY document in exactly one topic.' : 'Propón cómo organizarlos en UNIDADES y TEMAS y coloca CADA documento en un único tema.'}

${en ? 'Reply ONLY with a JSON object of this exact shape' : 'Responde SOLO con un objeto JSON con esta forma exacta'}:
{"units":[{"name":"...","topics":[{"name":"...","docs":[{"id":"<id>","why":"...","confidence":"seguro"|"revisar"}]}]}],"unassigned":[{"id":"<id>","why":"..."}]}

${en ? 'Rules' : 'Reglas'}:
- ${en ? 'Respect numbering and names ("UD1", "Tema 2"...). Keep the natural teaching order.' : 'Respeta la numeración y los nombres ("UD1", "Tema 2"...). Mantén el orden natural de enseñanza.'}
- ${en ? 'Unit and topic names: short and concrete (max 60 characters), taken from the content when possible.' : 'Nombres de unidades y temas: cortos y concretos (máx. 60 caracteres), sacados del contenido cuando se pueda.'}
- ${en ? 'Several documents of the same topic go in the same topic (slides + exercises + notes). Different topics need different topics.' : 'Varios documentos del mismo tema van juntos (presentación + ejercicios + apuntes). Temas distintos, temas distintos.'}
- why: ${en ? 'one short sentence (max 110 characters) saying what the document is about and why it goes there.' : 'una frase corta (máx. 110 caracteres) que diga de qué trata el documento y por qué va ahí.'}
- confidence: "seguro" ${en ? 'if it clearly belongs there; "revisar" if you are unsure.' : 'si encaja claramente; "revisar" si dudas.'}
- unassigned: ${en ? 'only documents you cannot classify (empty text, unrelated). Explain why in "why".' : 'solo los documentos que no puedas clasificar (sin texto, sin relación). Explica el motivo en "why".'}
- ${en ? 'Use ONLY the given ids; never invent documents. Do not leave any document out.' : 'Usa SOLO los ids dados; no inventes documentos. No dejes ningún documento fuera.'}
- ${en ? 'Write names and sentences in English.' : 'Escribe nombres y frases en español.'}`
}

function parseJson(text) {
  try { return JSON.parse(text) } catch {
    const a = text.indexOf('{'); const b = text.lastIndexOf('}')
    if (a === -1 || b <= a) return null
    try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
  }
}

/** Valida lo que dice el modelo: solo ids que existen, cada documento una vez, y lo que falte va a «sin clasificar». */
export function normalize(parsed, docs) {
  const ids = new Set(docs.map((d) => d.id))
  const used = new Set()
  const place = (d) => {
    const id = typeof d === 'string' ? d : d?.id
    if (!ids.has(id) || used.has(id)) return null
    used.add(id)
    return { id, why: clean(d?.why, 140), confidence: d?.confidence === 'revisar' ? 'revisar' : 'seguro' }
  }
  const units = (Array.isArray(parsed?.units) ? parsed.units : []).slice(0, 30).map((u) => ({
    name: clean(u?.name, 80) || 'Unidad',
    topics: (Array.isArray(u?.topics) ? u.topics : []).slice(0, 60).map((t) => ({
      name: clean(t?.name, 80) || 'Tema',
      docs: (Array.isArray(t?.docs) ? t.docs : []).map(place).filter(Boolean),
    })).filter((t) => t.docs.length),
  })).filter((u) => u.topics.length)
  const unassigned = (Array.isArray(parsed?.unassigned) ? parsed.unassigned : []).map(place).filter(Boolean)
  for (const d of docs) if (!used.has(d.id)) unassigned.push({ id: d.id, why: 'La IA no lo ha colocado: elige tú dónde va.', confidence: 'revisar' })
  return { units, unassigned }
}

export async function proposeOrganization({ subject, docs, lang }, env) {
  const list = docs.slice(0, MAX_DOCS).map((d) => ({
    id: clean(d.id, 60), name: clean(d.name, MAX_NAME), pages: Number.isFinite(d.pages) ? d.pages : null,
    text: clean(d.text, MAX_TEXT) || (lang === 'en' ? '(no readable text: probably scanned)' : '(sin texto legible: probablemente escaneado)'),
  })).filter((d) => d.id && d.name)
  const user = `${lang === 'en' ? 'Subject' : 'Asignatura'}: ${clean(subject, 120) || '—'}\n\n${list.map((d) => `[${d.id}] ${d.name}${d.pages ? ` (${d.pages} p.)` : ''}\n${d.text}`).join('\n\n---\n\n')}`
  const raw = await groqChat([{ role: 'system', content: systemPrompt(lang) }, { role: 'user', content: user }], env, { json: true, temperature: 0.2, maxTokens: 4096 })
  const parsed = parseJson(raw)
  if (!parsed) throw new Error(`Model returned invalid JSON: ${raw.slice(0, 200)}`)
  return normalize(parsed, list)
}
