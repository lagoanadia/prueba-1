import { request } from './api.js'

export const getFriends = () => request('/api/friends')
export const setUsername = (username) => request('/api/friends', { method: 'PUT', body: { username } })
export const addFriend = (username) => request('/api/friends', { method: 'POST', body: { username } })
export const removeFriend = (username) => request('/api/friends', { method: 'DELETE', body: { username } })
export const answerRequest = (username, accept) => request('/api/friends', { method: 'PATCH', body: { username, accept } })

// Aviso para el resto de la app (el globo de notificaciones) cuando cambian los amigos
export const FRIENDS_EVENT = 'friends-changed'
export const notifyFriendsChanged = (state) => window.dispatchEvent(new CustomEvent(FRIENDS_EVENT, { detail: state }))

// Cosas compartidas por amigos (cápsulas del tiempo)
export const getShared = () => request('/api/shares')
export const sendCapsule = (to, text, openDate) => request('/api/shares', { method: 'POST', body: { to, kind: 'capsule', text, openDate } })
export const openShared = (id) => request('/api/shares', { method: 'PATCH', body: { id } })
