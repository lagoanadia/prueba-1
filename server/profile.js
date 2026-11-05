// Perfil del usuario (de momento solo el avatar), en KV: "profile:<usuario>" -> { avatar }
import { AVATAR_OPTIONS, DEFAULT_AVATAR } from '../src/data/avatar.js'

export async function getProfile(env, userId) {
  const saved = await env.DATA.get(`profile:${userId}`, 'json')
  // Completa opciones nuevas y sustituye las que ya no existen por el valor por defecto
  const avatar = Object.fromEntries(Object.entries(AVATAR_OPTIONS).map(([k, opts]) => {
    const v = saved?.avatar?.[k]
    return [k, opts.some((o) => o.id === v) ? v : DEFAULT_AVATAR[k]]
  }))
  return { avatar }
}

export async function saveProfile(env, userId, profile) {
  await env.DATA.put(`profile:${userId}`, JSON.stringify(profile))
}
