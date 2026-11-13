import { request } from './api.js'

// Proyectos de Trabajo compartidos con amigos
export const listShared = () => request('/api/projects')
export const createShared = (project, members) => request('/api/projects', { method: 'POST', body: { action: 'create', project, members } })
export const saveShared = (id, base, project) => request('/api/projects', { method: 'PUT', body: { id, base, project } })
export const saveSharedVersion = (id, note) => request('/api/projects', { method: 'POST', body: { action: 'version', id, note } })
export const restoreSharedVersion = (id, n) => request('/api/projects', { method: 'POST', body: { action: 'restore', id, n } })
export const inviteShared = (id, members) => request('/api/projects', { method: 'POST', body: { action: 'invite', id, members } })
export const leaveShared = (id) => request('/api/projects', { method: 'POST', body: { action: 'leave', id } })
