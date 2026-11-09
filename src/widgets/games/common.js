// Utilidades de los juegos: fecha, semilla, idioma, puntuación y reto del servidor
import { getLang } from '../../i18n/index.js'
import { todayISO } from '../../lib/dates.js'
import { request } from '../../services/api.js'
import { social, socialChanged } from '../../services/socialService.js'

/** Números aleatorios repetibles: el mismo día da el mismo reto a todo el mundo. */
export function seeded(seedText) {
  let h = 1779033703
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353) >>> 0
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const shuffle = (arr, rnd) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
export const lang = () => getLang()
export const today = () => todayISO()

/** Puntuación del día para el ranking con tus amigos (si no tienes amigos o no hay red, no pasa nada). */
export const sendScore = (game, value) => social('score', { game, value }).then(socialChanged).catch(() => {})
/** Reto del día preparado por el servidor (Spelling Bee y crucigrama). */
export const fetchDaily = (game) => request(`/api/games?game=${game}&lang=${lang()}&date=${today()}`)
export const clock = (s) => { const t = Math.max(0, Math.round(s || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}` }
