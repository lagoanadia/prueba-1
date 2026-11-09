import { request } from './api.js'
import { todayISO } from '../lib/dates.js'

export const getSocial = () => request(`/api/social?today=${todayISO()}`)
export const social = (action, body = {}) => request('/api/social', { method: 'POST', body: { action, today: todayISO(), ...body } })
export const EMOJIS = ['👏', '🔥', '❤️', '😂']

// Aviso para que todas las piezas (feed, inicio…) se pongan al día tras un cambio
export const SOCIAL_EVENT = 'social-changed'
export const socialChanged = () => window.dispatchEvent(new Event(SOCIAL_EVENT))
