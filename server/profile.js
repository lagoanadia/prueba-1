// Perfil del usuario (de momento solo el avatar), en KV: "profile:<usuario>" -> { avatar }
import { DEFAULT_AVATAR } from '../src/data/avatar.js'

export async function getProfile(env, userId) {
  const saved = await env.DATA.get(`profile:${userId}`, 'json')
  return { avatar: { ...DEFAULT_AVATAR, ...saved?.avatar } } // completa con las opciones nuevas
}

export async function saveProfile(env, userId, profile) {
  await env.DATA.put(`profile:${userId}`, JSON.stringify(profile))
}
