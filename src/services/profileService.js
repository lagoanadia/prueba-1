import { request } from './api.js'

export const getProfile = () => request('/api/profile')
export const saveAvatar = (avatar) => request('/api/profile', { method: 'PUT', body: { avatar } })
export const saveSettings = (settings) => request('/api/profile', { method: 'PUT', body: { settings } })
