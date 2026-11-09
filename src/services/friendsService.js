import { request } from './api.js'

export const getFriends = () => request('/api/friends')
export const setUsername = (username) => request('/api/friends', { method: 'PUT', body: { username } })
export const addFriend = (username) => request('/api/friends', { method: 'POST', body: { username } })
export const removeFriend = (username) => request('/api/friends', { method: 'DELETE', body: { username } })
