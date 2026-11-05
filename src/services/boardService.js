import { request } from './api.js'

export const getBoard = (area) => request(`/api/board?area=${encodeURIComponent(area)}`)
export const saveBoard = (area, board) => request(`/api/board?area=${encodeURIComponent(area)}`, { method: 'PUT', body: board })
