// Sugerencias de ingredientes para un plato. Solo PROPONE: el usuario elige cuáles añade.
import { groqChat } from './groq.js'

const clean = (s, n) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '')

export async function suggestIngredients({ dish, have, lang }, env) {
  const en = lang === 'en'
  const system = `${en ? 'You suggest typical ingredients for a dish' : 'Sugieres ingredientes típicos de un plato'}.
${en ? 'Reply ONLY with JSON' : 'Responde SOLO con JSON'}: {"suggestions":["..."]}
- ${en ? 'Max 8 short ingredient names (max 30 characters), no quantities.' : 'Máximo 8 nombres cortos de ingredientes (máx. 30 caracteres), sin cantidades.'}
- ${en ? 'Do not repeat the ingredients already added.' : 'No repitas los ingredientes ya añadidos.'}
- ${en ? 'Write in English.' : 'Escribe en español.'}`
  const user = `${en ? 'Dish' : 'Plato'}: ${clean(dish, 80)}\n${en ? 'Already added' : 'Ya añadidos'}: ${have.map((x) => clean(x, 40)).filter(Boolean).slice(0, 30).join(', ') || '—'}`
  const raw = await groqChat([{ role: 'system', content: system }, { role: 'user', content: user }], env, { json: true, temperature: 0.3, maxTokens: 400 })
  let parsed = null
  try { parsed = JSON.parse(raw) } catch { /* respuesta inválida: sin sugerencias */ }
  const seen = new Set(have.map((x) => String(x).toLowerCase()))
  return (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
    .map((x) => clean(x, 30)).filter((x) => x && !seen.has(x.toLowerCase())).slice(0, 8)
}
