/*
 * GOOGLE CALENDAR (en el navegador)
 * Pide permiso con Google Identity Services y habla directamente con la API de Calendar:
 * leer tus eventos para enseñarlos en inblocks y crear allí los eventos nuevos que hagas aquí.
 * El permiso (token) dura ~1 h y solo vive en esta pestaña; nunca pasa por nuestro servidor.
 */
import { loadGoogleScript } from '../components/GoogleSignInButton.jsx'

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const FLAG = 'inblocks:gcal' // "conectado" (se recuerda entre sesiones)
const TOKEN = 'inblocks:gcal-token' // { value, exp } solo en esta pestaña

const store = {
  get: (s, k) => { try { return s.getItem(k) } catch { return null } },
  set: (s, k, v) => { try { v == null ? s.removeItem(k) : s.setItem(k, v) } catch { /* sin almacenamiento */ } },
}
export const isLinked = () => store.get(localStorage, FLAG) === 'on'
const token = () => { try { const t = JSON.parse(store.get(sessionStorage, TOKEN)); return t && t.exp > Date.now() ? t.value : null } catch { return null } }
export const hasToken = () => Boolean(token())

/** Pide permiso a Google (abre su ventanita). Debe llamarse desde un clic. */
export async function connect() {
  await loadGoogleScript()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      prompt: isLinked() ? '' : 'consent',
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error('Google no ha dado permiso'))
        store.set(sessionStorage, TOKEN, JSON.stringify({ value: r.access_token, exp: Date.now() + (Number(r.expires_in) - 60) * 1000 }))
        store.set(localStorage, FLAG, 'on')
        resolve(r.access_token)
      },
      error_callback: () => reject(new Error('Se ha cerrado la ventana de Google')),
    })
    client.requestAccessToken()
  })
}

export function disconnect() {
  const t = token()
  if (t) window.google?.accounts?.oauth2?.revoke(t, () => {})
  store.set(sessionStorage, TOKEN, null)
  store.set(localStorage, FLAG, null)
}

async function call(url, opts = {}) {
  const t = token()
  if (!t) throw Object.assign(new Error('Vuelve a conectar Google Calendar'), { expired: true })
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } })
  if (r.status === 401) { store.set(sessionStorage, TOKEN, null); throw Object.assign(new Error('Vuelve a conectar Google Calendar'), { expired: true }) }
  if (!r.ok) throw new Error('Google Calendar no responde')
  return r.json()
}

/** Tus eventos de Google entre dos fechas (YYYY-MM-DD), ya en el formato del calendario de inblocks. */
export async function listEvents(from, to) {
  const params = new URLSearchParams({ timeMin: new Date(`${from}T00:00:00`).toISOString(), timeMax: new Date(`${to}T23:59:59`).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' })
  const data = await call(`${API}?${params}`)
  return (data.items ?? []).filter((e) => e.status !== 'cancelled').map((e) => {
    const allDay = Boolean(e.start?.date)
    const start = allDay ? e.start.date : new Date(e.start.dateTime)
    const date = allDay ? start : start.toLocaleDateString('en-CA')
    const time = allDay ? '' : start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    return { id: e.id, date, title: e.summary || '(sin título)', time, link: e.htmlLink }
  })
}

/** Crea un evento en tu Google Calendar (todo el día si no tiene hora). */
export async function createEvent({ title, date, time }) {
  let body
  if (time) {
    const start = new Date(`${date}T${time}:00`)
    body = { summary: title, start: { dateTime: start.toISOString() }, end: { dateTime: new Date(start.getTime() + 3600e3).toISOString() } }
  } else {
    const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 1)
    body = { summary: title, start: { date }, end: { date: next.toLocaleDateString('en-CA') } }
  }
  return call(API, { method: 'POST', body: JSON.stringify(body) })
}
