import { getLang } from '../i18n/index.js'
// Voz del asistente (texto -> voz) con la API del navegador. Si no existe, no pasa nada.
export function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = getLang() === 'en' ? 'en-GB' : 'es-ES'
  window.speechSynthesis.speak(u)
}

// Para confirmar por voz: quitamos tildes y signos y miramos la primera palabra.
const normalize = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, '').trim()

export const isYes = (t) => /^(yes|yeah|yep|sure|do it|go ahead|si|sip|vale|ok|okay|claro|confirma|confirmalo|adelante|perfecto|dale|venga|correcto|hazlo)\b/.test(normalize(t))
export const isNo = (t) => /^(nope|cancel|stop|no|nop|cancela|cancelalo|nada|dejalo|para)\b/.test(normalize(t))
