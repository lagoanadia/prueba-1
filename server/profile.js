// Perfil del usuario (de momento solo el avatar), en KV: "profile:<usuario>" -> { avatar }
import { DEFAULT_AVATAR } from '../src/data/avatar.js'

export async function getProfile(env, userId) {
  return (await env.DATA.get(`profile:${userId}`, 'json')) ?? { avatar: DEFAULT_AVATAR }
}

export async function saveProfile(env, userId, profile) {
  await env.DATA.put(`profile:${userId}`, JSON.stringify(profile))
}
