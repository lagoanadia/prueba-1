/**
 * Capa de LÓGICA CON IA (frontend).
 *
 * La UI solo llama a estas funciones. La IA de verdad está en el backend
 * (api/chat.js -> server/groq.js), porque la API key de Groq no puede estar aquí.
 */
import { request } from './api.js'

/**
 * @param {{role: 'user'|'assistant', content: string}[]} messages  historial del chat
 * @param {{type: string, name: string, text: string|null} | null} material
 * @returns {Promise<string>} respuesta del asistente
 */
export async function askAssistant(messages, material) {
  const { reply } = await request('/api/chat', { method: 'POST', body: { messages, material } })
  return reply
}

/**
 * Convierte lo que elige el usuario en la pantalla Home en un objeto "material".
 * TODO (IA): extraer el texto real de PDF (pdfjs-dist) y PPTX (JSZip).
 */
export async function buildMaterial(type, input) {
  if (type === 'notes') return { type: 'notes', name: 'My notes', text: input }
  return { type, name: input.name, text: null }
}
