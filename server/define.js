// Definición cortita de una palabra (para el Spelling Bee). Se busca en Wikcionario y, si no está, se le pide a la IA en una frase;
// se guarda en KV un mes ("def:<idioma>:<palabra>") para no repetir la consulta.
import { groqChat } from './groq.js'

const decode = (t) => t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
/** HTML de Wikcionario → texto de una frase, de no más de ~150 caracteres. */
export function shortText(html) {
  const t = decode(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const first = t.split(/(?<=[.;])\s/).find((x) => x.length >= 12) ?? t // se salta etiquetas sueltas del tipo «Sustantivo.»
  return (first.length > 150 ? `${first.slice(0, 147).trimEnd()}…` : first).replace(/[.;]$/, '')
}

const UA = { 'User-Agent': 'inblocks-word-game/1.0 (https://prueba-1.lagoanadia.workers.dev)', Accept: 'application/json' }
const fold = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** Wikitexto → texto plano: [[a|b]] → b, {{plantillas}} fuera, sin negritas. */
export function cleanWikitext(t) {
  return t
    .replace(/\{\{(?:l|l\+|plm|f\.?\w*)\|[a-z-]+\|([^|}]+)[^}]*\}\}/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
/** Primera acepción de la sección en español: líneas «;1 …: definición». */
export function firstSpanishSense(wikitext) {
  const es = wikitext.split(/\{\{lengua\|/).find((part) => part.startsWith('es}}')) ?? wikitext
  for (const line of es.split('\n')) {
    const m = line.match(/^;\s*\d+[^:]*:\s*(.+)$/)
    if (!m) continue
    const d = cleanWikitext(m[1]).replace(/^[:.\s]+/, '')
    if (d.length > 3) return shortText(d)
  }
  return null
}
// El Wikcionario en español no tiene la API de definiciones: se lee el wikitexto de la página.
// Las palabras del juego vienen sin tildes (CAMION), así que si no existe se busca el título con tildes.
async function fromEsWiktionary(word) {
  const api = (q) => fetch(`https://es.wiktionary.org/w/api.php?format=json&formatversion=2&${q}`, { headers: UA }).then((r) => (r.ok ? r.json() : null))
  const page = async (title) => (await api(`action=parse&prop=wikitext&page=${encodeURIComponent(title)}`))?.parse?.wikitext ?? null
  let text = await page(word)
  if (!text) {
    const found = await api(`action=opensearch&limit=10&search=${encodeURIComponent(word)}`)
    const title = (found?.[1] ?? []).find((t) => fold(t) === fold(word))
    if (title) text = await page(title)
  }
  return text ? firstSpanishSense(text) : null
}

async function fromWiktionary(word, lang) {
  if (lang !== 'en') return fromEsWiktionary(word)
  const host = lang === 'en' ? 'en.wiktionary.org' : 'es.wiktionary.org'
  const res = await fetch(`https://${host}/api/rest_v1/page/definition/${encodeURIComponent(word)}`, { headers: UA })
  if (!res.ok) return null
  const data = await res.json()
  const entries = data[lang === 'en' ? 'en' : 'es'] ?? []
  for (const e of entries) {
    const d = (e.definitions ?? []).map((x) => shortText(x.definition)).find((t) => t.length > 3)
    if (d) return `${e.partOfSpeech ? `${String(e.partOfSpeech).toLowerCase()}: ` : ''}${d}`
  }
  return null
}

async function fromAI(word, lang, env) {
  const sys = lang === 'en'
    ? 'You define words for a word game. Reply with ONE short sentence (max 15 words) defining the English word; if it is an inflected form, say so. If it is not a real word reply exactly NONE.'
    : 'Defines palabras para un juego. Responde con UNA frase corta (máximo 15 palabras) que defina la palabra española; si es una forma conjugada o un plural, dilo. La palabra puede venir sin tildes (CAMION = camión). Si no es una palabra real responde exactamente NONE.'
  const out = (await groqChat([{ role: 'system', content: sys }, { role: 'user', content: word }], env, { temperature: 0.1, maxTokens: 80 })).trim().replace(/^["«]|["»]$/g, '')
  return out && !/^none\b/i.test(out) ? out.replace(/\s+/g, ' ') : null
}

export async function defineWord(env, word, lang) {
  const w = String(word).toLowerCase().replace(/[^a-zñáéíóúü]/g, '').slice(0, 30)
  if (w.length < 2) return { word: w, definition: null }
  const key = `def:${lang}:${w}`
  const cached = await env.DATA?.get(key)
  if (cached) return { word: w, definition: cached }
  let definition = null
  try { definition = await fromWiktionary(w, lang) } catch (e) { console.error(e) }
  if (!definition) { try { definition = await fromAI(w, lang, env) } catch (e) { console.error(e) } }
  if (definition) await env.DATA?.put(key, definition, { expirationTtl: 60 * 60 * 24 * 30 })
  return { word: w, definition }
}
