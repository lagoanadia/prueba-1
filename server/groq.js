/*
 * CLIENTE DE GROQ
 *
 * Groq expone una API compatible con la de OpenAI, así que basta un fetch.
 * La API key SOLO vive aquí, en el servidor. Si estuviera en el frontend,
 * cualquiera podría verla con las DevTools y gastar tu cuota.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-oss-120b'

export class GroqError extends Error {
  constructor(status, detail) {
    super(`Groq API error ${status}: ${detail}`)
    this.status = status
  }
}

/**
 * @param {{role: 'system'|'user'|'assistant', content: string}[]} messages
 * @returns {Promise<string>} el texto de la respuesta del modelo
 */
export async function groqChat(messages, env, { temperature = 0.4, maxTokens = 2048, json = false } = {}) {
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || DEFAULT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      // JSON mode: obliga al modelo a devolver un objeto JSON válido
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!response.ok) throw new GroqError(response.status, await response.text())

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

const TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const TRANSCRIBE_MODEL = 'whisper-large-v3-turbo'

/**
 * Audio -> texto con Whisper (en Groq).
 * @param {Blob} audio  lo que grabó el navegador (webm en Chrome, mp4 en Safari)
 * @returns {Promise<string>}
 */
export async function groqTranscribe(audio, env, filename, lang = 'es') {
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  // La API de audio espera un formulario multipart, como un <form> con un <input type="file">.
  const form = new FormData()
  form.append('file', audio, filename)
  form.append('model', TRANSCRIBE_MODEL)
  form.append('response_format', 'json')
  // Sin esto Whisper adivina el idioma y con audios cortos se equivoca (p. ej. lo toma por islandés).
  form.append('language', lang === 'en' ? 'en' : 'es')
  form.append('temperature', '0')
  // Pista de contexto: ayuda a acertar con vocabulario y puntuación en español.
  form.append('prompt', lang === 'en' ? 'Voice notes for a personal planner: classes, exams, gym, habits, work and meals.' : 'Notas de voz en español para una agenda: clases, exámenes, gimnasio, hábitos, trabajo y comidas.')

  const response = await fetch(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` }, // NO poner Content-Type: fetch lo genera con el "boundary"
    body: form,
  })

  if (!response.ok) throw new GroqError(response.status, await response.text())
  const data = await response.json()
  return (data.text ?? '').trim()
}
