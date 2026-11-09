// Cosas que un amigo te manda (de momento, cápsulas del tiempo). En KV: "inbox:<id>" -> [item]
// item = { id, from, kind: 'capsule', text, openDate, createdAt, openedAt? }
import { getFriendIds, getUsername } from './friends.js'
import { getProfile } from './profile.js'

const MAX_ITEMS = 200
const MAX_TEXT = 500
const ISO = /^\d{4}-\d{2}-\d{2}$/
const today = () => new Date().toISOString().slice(0, 10)

const getInbox = async (env, id) => (await env.DATA.get(`inbox:${id}`, 'json')) ?? []
const saveInbox = (env, id, list) => env.DATA.put(`inbox:${id}`, JSON.stringify(list.slice(-MAX_ITEMS)))

/** Envía una cápsula a un amigo. Devuelve un mensaje de error o null. */
export async function sendCapsule(env, fromId, toId, { text, openDate }) {
  if (!(await getFriendIds(env, fromId)).includes(toId)) return 'Solo puedes enviar cápsulas a tus amigos'
  const clean = typeof text === 'string' ? text.trim().slice(0, MAX_TEXT) : ''
  if (!clean) return 'La cápsula está vacía'
  if (!ISO.test(openDate ?? '') || openDate <= today()) return 'La fecha tiene que ser futura'
  const list = await getInbox(env, toId)
  list.push({ id: crypto.randomUUID(), from: fromId, kind: 'capsule', text: clean, openDate, createdAt: today() })
  await saveInbox(env, toId, list)
  return null
}

/**
 * Lo recibido, con el nombre y el avatar de quien lo manda.
 * El texto de una cápsula cerrada NO sale del servidor hasta su fecha (sin trampas mirando la red).
 */
export async function listInbox(env, id) {
  const list = await getInbox(env, id)
  const senders = new Map()
  for (const from of new Set(list.map((x) => x.from))) {
    senders.set(from, { username: await getUsername(env, from), avatar: (await getProfile(env, from)).avatar })
  }
  return list.map((x) => ({
    id: x.id, kind: x.kind, openDate: x.openDate, createdAt: x.createdAt, openedAt: x.openedAt ?? null,
    from: senders.get(x.from),
    text: x.openDate <= today() ? x.text : null,
  }))
}

/** Marca una cápsula recibida como abierta (solo si ya llegó su fecha). */
export async function openItem(env, id, itemId) {
  const list = await getInbox(env, id)
  const item = list.find((x) => x.id === itemId)
  if (!item) return 'No existe'
  if (item.openDate > today()) return 'Todavía no se puede abrir'
  item.openedAt = item.openedAt ?? today()
  await saveInbox(env, id, list)
  return null
}
