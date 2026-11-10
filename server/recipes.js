// Importar recetas de un PDF: el modelo extrae las recetas del texto. Solo PROPONE; el usuario revisa y confirma.
import { groqChat } from './groq.js'

const MEALS = ['desayuno', 'media', 'comida', 'merienda', 'cena']
const clean = (s, n) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '')
export const MAX_TEXT = 9000
// Modelo con visión (lee fotos). Se puede cambiar con la variable GROQ_VISION_MODEL del Worker.
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
export const MAX_IMAGE = 5_000_000 // caracteres del data URL (≈ 3,7 MB)

function systemPrompt(lang) {
  const en = lang === 'en'
  return `${en ? 'You extract RECIPES from the text of a cookbook PDF' : 'Extraes RECETAS del texto de un PDF de recetas'}.
${en ? 'Reply ONLY with JSON' : 'Responde SOLO con JSON'}: {"recipes":[{"name":"...","meals":["desayuno"|"media"|"comida"|"merienda"|"cena"],"time":<minutes or null>,"ingredients":["..."],"steps":["..."]}]}
- ${en ? 'Only real recipes that appear in the text; never invent recipes, ingredients or steps.' : 'Solo recetas que aparezcan de verdad en el texto; no inventes recetas, ingredientes ni pasos.'}
- ${en ? 'A recipe cut off at the start or end of the text: include it only if you have its name and something useful.' : 'Si una receta aparece cortada al principio o al final del texto, inclúyela solo si tienes su nombre y algo útil.'}
- meals: ${en ? 'when it is typically eaten (one or more). Use "media" for mid-morning snacks.' : 'cuándo se suele comer (una o varias). "media" es la media mañana.'}
- ${en ? 'Ingredients: short names without quantities (max 40 characters). Steps: one short sentence each.' : 'Ingredientes: nombres cortos sin cantidades (máx. 40 caracteres). Pasos: una frase corta cada uno.'}
- ${en ? 'Write in the language of the recipe.' : 'Escribe en el idioma de la receta.'}`
}

function parseJson(text) {
  try { return JSON.parse(text) } catch {
    const a = text.indexOf('{'); const b = text.lastIndexOf('}')
    if (a === -1 || b <= a) return null
    try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
  }
}

const mapRecipes = (parsed) => (Array.isArray(parsed?.recipes) ? parsed.recipes : []).slice(0, 30).map((r) => ({
  name: clean(r?.name, 80),
  meals: [...new Set((Array.isArray(r?.meals) ? r.meals : []).filter((m) => MEALS.includes(m)))],
  time: Number.isFinite(r?.time) && r.time > 0 && r.time < 1000 ? Math.round(r.time) : null,
  ingredients: (Array.isArray(r?.ingredients) ? r.ingredients : []).map((x) => clean(x, 40)).filter(Boolean).slice(0, 40),
  steps: (Array.isArray(r?.steps) ? r.steps : []).map((x) => clean(x, 200)).filter(Boolean).slice(0, 30),
})).filter((r) => r.name)

/** Recetas de un trozo de texto (PDF) o de una foto (`image` = data URL de una imagen). */
export async function extractRecipes({ text, image, lang }, env) {
  let raw
  if (image) {
    const ask = lang === 'en' ? 'Read the recipe(s) in this photo and reply with the JSON.' : 'Lee la(s) receta(s) de esta foto y responde con el JSON.'
    raw = await groqChat(
      [{ role: 'system', content: systemPrompt(lang) }, { role: 'user', content: [{ type: 'text', text: ask }, { type: 'image_url', image_url: { url: image } }] }],
      env, { temperature: 0.1, maxTokens: 4096, model: env.GROQ_VISION_MODEL || VISION_MODEL })
  } else {
    raw = await groqChat([{ role: 'system', content: systemPrompt(lang) }, { role: 'user', content: clean(text, MAX_TEXT) }], env, { json: true, temperature: 0.1, maxTokens: 4096 })
  }
  const parsed = parseJson(raw)
  if (!parsed) throw new Error(`Model returned invalid JSON: ${raw.slice(0, 200)}`)
  return mapRecipes(parsed)
}
