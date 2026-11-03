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
export async function groqChat(messages, { temperature = 0.4, maxTokens = 2048 } = {}) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) throw new GroqError(response.status, await response.text())

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}
