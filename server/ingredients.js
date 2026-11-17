// Sugerencias de ingredientes para un plato. Solo PROPONE: el usuario elige cuáles añade.
import { groqChat } from './groq.js'

const clean = (s, n) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '')

export async function suggestIngredients({ dish, have, lang }, env) {
  const en = lang === 'en'
  const system = `${en ? 'You suggest typical ingredients and spices for a dish' : 'Sugieres ingredientes y especias típicos de un plato'}.
${en ? 'Reply ONLY with JSON' : 'Responde SOLO con JSON'}: {"ingredients":["..."],"spices":["..."]}
- ${en ? 'ingredients: max 8 short names (max 30 characters), no quantities. spices: max 5 spices or dried herbs (pepper, cumin, bay leaf...).' : 'ingredients: máximo 8 nombres cortos (máx. 30 caracteres), sin cantidades. spices: máximo 5 especias o hierbas secas (pimienta, comino, laurel...).'}
- ${en ? 'Never put a spice in ingredients, nor an ingredient in spices.' : 'Nunca pongas una especia en ingredients ni un ingrediente en spices.'}
- ${en ? 'Do not repeat what is already added.' : 'No repitas lo ya añadido.'}
- ${en ? 'Write in English.' : 'Escribe en español.'}`
  const user = `${en ? 'Dish' : 'Plato'}: ${clean(dish, 80)}\n${en ? 'Already added' : 'Ya añadidos'}: ${have.map((x) => clean(x, 40)).filter(Boolean).slice(0, 40).join(', ') || '—'}`
  const raw = await groqChat([{ role: 'system', content: system }, { role: 'user', content: user }], env, { json: true, temperature: 0.3, maxTokens: 2048 })
  let parsed = null
  try { parsed = JSON.parse(raw) } catch { /* respuesta inválida: sin sugerencias */ }
  const seen = new Set(have.map((x) => String(x).toLowerCase()))
  const list = (v, n) => (Array.isArray(v) ? v : []).map((x) => clean(x, 30)).filter((x) => x && !seen.has(x.toLowerCase())).slice(0, n)
  return { suggestions: list(parsed?.ingredients ?? parsed?.suggestions, 8), spices: list(parsed?.spices, 5) }
}

/** De una lista de nombres, cuáles son especias (o hierbas aromáticas). */
export async function classifySpices({ names, lang }, env) {
  const list = names.map((x) => clean(x, 40)).filter(Boolean).slice(0, 20)
  if (!list.length) return []
  const system = lang === 'en'
    ? 'You classify food items. Reply ONLY with JSON {"spices":["..."]} listing which of the given names are spices or dried aromatic herbs (pepper, cumin, paprika, bay leaf, oregano...). Fresh vegetables, meat, oils and sauces are NOT spices. Use the exact given names.'
    : 'Clasificas alimentos. Responde SOLO con JSON {"spices":["..."]} con cuáles de los nombres dados son especias o hierbas aromáticas secas (pimienta, comino, pimentón, laurel, orégano...). Las verduras frescas, la carne, los aceites y las salsas NO son especias. Usa los nombres exactos que te doy.'
  const raw = await groqChat([{ role: 'system', content: system }, { role: 'user', content: list.join('\n') }], env, { json: true, temperature: 0, maxTokens: 1024 })
  let parsed = null
  try { parsed = JSON.parse(raw) } catch { return [] }
  const ok = new Set(list.map((x) => x.toLowerCase()))
  return (Array.isArray(parsed?.spices) ? parsed.spices : []).map((x) => clean(x, 40)).filter((x) => ok.has(x.toLowerCase()))
}
