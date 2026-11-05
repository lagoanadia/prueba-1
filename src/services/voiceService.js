/**
 * Capa de VOZ + IA. La IA de verdad está en el backend (la API key no puede estar aquí).
 *   1. transcribe(audio) -> POST /api/transcribe -> Groq Whisper -> texto
 *   2. runCommand(text)  -> POST /api/command    -> Groq decide qué apuntar y dónde
 */
import { ApiError, request } from './api.js'

/** @param {Blob} audio */
export async function transcribe(audio) {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    credentials: 'same-origin',
    // Mandamos el audio tal cual; el tipo sin parámetros (p. ej. "audio/webm;codecs=opus" -> "audio/webm")
    headers: { 'Content-Type': audio.type.split(';')[0] },
    body: audio,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'No he podido transcribir el audio')
  return data.text
}

/** @returns {Promise<{reply: string, actions: {section: string, title: string}[]}>} */
export async function runCommand(text) {
  const today = new Date().toLocaleDateString('en-CA') // "2026-11-03" en la zona horaria del usuario
  return request('/api/command', { method: 'POST', body: { text, today } })
}
