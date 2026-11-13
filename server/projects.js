/*
 * PROYECTOS COMPARTIDOS DE TRABAJO (Cloudflare KV)
 *   "shproj:<id>"       -> { id, owner, members: [userId], rev, project, versions: [{ n, note, by, at }], dirty, lastEdit: { by, at } }
 *   "shver:<id>:<n>"    -> { n, note, by, at, project }   (foto del proyecto en cada versión)
 *   "shproj-list:<uid>" -> [id]                            (proyectos compartidos de cada persona)
 * Todos los miembros editan la misma copia de trabajo; cada vez que alguien «guarda versión» se hace una foto.
 */
import { getFriendIds, getUsername, findUserId, normalizeUsername } from './friends.js'
import { getProfile } from './profile.js'
import { merge3 } from '../src/lib/merge3.js'

const MAX_BYTES = 3_000_000
const MAX_MEMBERS = 8
const MAX_VERSIONS = 50
const MAX_PROJECTS = 30

const get = (env, key) => env.DATA.get(key, 'json')
const put = (env, key, value) => env.DATA.put(key, JSON.stringify(value))
const now = () => new Date().toISOString()
const idsOf = async (env, uid) => (await get(env, `shproj-list:${uid}`)) ?? []
const addToList = async (env, uid, id) => { const l = await idsOf(env, uid); if (!l.includes(id)) await put(env, `shproj-list:${uid}`, [...l, id]) }
const removeFromList = async (env, uid, id) => put(env, `shproj-list:${uid}`, (await idsOf(env, uid)).filter((x) => x !== id))

const validProject = (p) => p && typeof p === 'object' && !Array.isArray(p) && typeof p.name === 'string' && Array.isArray(p.tasks) && JSON.stringify(p).length <= MAX_BYTES

async function view(env, rec, uid, cache) {
  const user = async (id) => {
    if (!cache.has(id)) cache.set(id, { username: await getUsername(env, id), avatar: (await getProfile(env, id)).avatar })
    return cache.get(id)
  }
  const members = []
  for (const id of rec.members) members.push({ ...(await user(id)), you: id === uid, owner: id === rec.owner })
  const versions = []
  for (const v of rec.versions) versions.push({ n: v.n, note: v.note, at: v.at, by: (await user(v.by)).username })
  return {
    id: rec.id, rev: rec.rev, project: rec.project, mine: rec.owner === uid, members, versions, dirty: rec.dirty,
    lastEdit: rec.lastEdit ? { by: (await user(rec.lastEdit.by)).username, you: rec.lastEdit.by === uid, at: rec.lastEdit.at } : null,
  }
}

const load = async (env, uid, id) => {
  const rec = await get(env, `shproj:${id}`)
  return rec && rec.members.includes(uid) ? rec : null
}

export async function listProjects(env, uid) {
  const cache = new Map()
  const out = []
  for (const id of await idsOf(env, uid)) {
    const rec = await load(env, uid, id)
    if (rec) out.push(await view(env, rec, uid, cache))
  }
  return out
}

/** Convierte nombres de usuario en ids, comprobando que son amigos de quien invita. */
async function friendIds(env, uid, usernames) {
  const mine = await getFriendIds(env, uid)
  const ids = []
  for (const name of usernames ?? []) {
    const id = await findUserId(env, normalizeUsername(name))
    if (!id || !mine.includes(id)) return { error: 'Solo puedes invitar a tus amigos' }
    if (!ids.includes(id)) ids.push(id)
  }
  return { ids }
}

export async function createProject(env, uid, { project, members }) {
  if (!validProject(project)) return { error: 'Proyecto no válido' }
  if ((await idsOf(env, uid)).length >= MAX_PROJECTS) return { error: 'Demasiados proyectos compartidos' }
  const { ids, error } = await friendIds(env, uid, members)
  if (error) return { error }
  if (ids.length + 1 > MAX_MEMBERS) return { error: `Máximo ${MAX_MEMBERS} personas` }
  const id = crypto.randomUUID()
  const rec = { id, owner: uid, members: [uid, ...ids.filter((x) => x !== uid)], rev: 1, project: { ...project, id }, versions: [], dirty: true, lastEdit: { by: uid, at: now() } }
  await put(env, `shproj:${id}`, rec)
  for (const m of rec.members) await addToList(env, m, id)
  return { project: await view(env, rec, uid, new Map()) }
}

/** Guarda cambios. Si alguien guardó mientras tanto, se fusionan (mine + theirs respecto a base). */
export async function saveProject(env, uid, id, { base, project }) {
  const rec = await load(env, uid, id)
  if (!rec) return { error: 'No estás en este proyecto', status: 404 }
  if (!validProject(project)) return { error: 'Proyecto no válido' }
  rec.project = { ...(base ? merge3(base, project, rec.project) : project), id }
  if (!validProject(rec.project)) return { error: 'Proyecto no válido' }
  rec.rev += 1
  rec.dirty = true
  rec.lastEdit = { by: uid, at: now() }
  await put(env, `shproj:${id}`, rec)
  return { rev: rec.rev, project: rec.project }
}

const snapshot = async (env, rec, uid, note) => {
  const n = (rec.versions.at(-1)?.n ?? 0) + 1
  const v = { n, note: String(note ?? '').trim().slice(0, 120), by: uid, at: now() }
  await put(env, `shver:${rec.id}:${n}`, { ...v, project: rec.project })
  rec.versions.push(v)
  while (rec.versions.length > MAX_VERSIONS) await env.DATA.delete(`shver:${rec.id}:${rec.versions.shift().n}`)
  rec.dirty = false
}

export async function saveVersion(env, uid, id, note) {
  const rec = await load(env, uid, id)
  if (!rec) return { error: 'No estás en este proyecto', status: 404 }
  await snapshot(env, rec, uid, note)
  await put(env, `shproj:${id}`, rec)
  return { ok: true }
}

/** Vuelve a una versión: el proyecto pasa a ser esa foto y se apunta como versión nueva (no se pierde nada). */
export async function restoreVersion(env, uid, id, n) {
  const rec = await load(env, uid, id)
  if (!rec) return { error: 'No estás en este proyecto', status: 404 }
  const old = await get(env, `shver:${id}:${Number(n)}`)
  if (!old) return { error: 'Esa versión ya no existe', status: 404 }
  // Si había cambios sin guardar, se guardan antes como versión para poder volver a ellos
  if (rec.dirty) await snapshot(env, rec, uid, 'Antes de restaurar')
  rec.project = { ...old.project, id }
  rec.rev += 1
  rec.lastEdit = { by: uid, at: now() }
  await snapshot(env, rec, uid, `Restaurada la versión ${old.n}`)
  await put(env, `shproj:${id}`, rec)
  return { ok: true }
}

export async function invite(env, uid, id, usernames) {
  const rec = await load(env, uid, id)
  if (!rec) return { error: 'No estás en este proyecto', status: 404 }
  if (rec.owner !== uid) return { error: 'Solo quien lo creó puede invitar' }
  const { ids, error } = await friendIds(env, uid, usernames)
  if (error) return { error }
  const add = ids.filter((x) => !rec.members.includes(x))
  if (rec.members.length + add.length > MAX_MEMBERS) return { error: `Máximo ${MAX_MEMBERS} personas` }
  rec.members.push(...add)
  await put(env, `shproj:${id}`, rec)
  for (const m of add) await addToList(env, m, id)
  return { ok: true }
}

/** Salir del proyecto. Si sales tú y era tuyo, pasa a otro miembro; si no queda nadie, se borra. */
export async function leaveProject(env, uid, id) {
  const rec = await load(env, uid, id)
  if (!rec) return { ok: true }
  rec.members = rec.members.filter((m) => m !== uid)
  await removeFromList(env, uid, id)
  if (rec.members.length === 0) {
    for (const v of rec.versions) await env.DATA.delete(`shver:${id}:${v.n}`)
    await env.DATA.delete(`shproj:${id}`)
    return { ok: true }
  }
  if (rec.owner === uid) rec.owner = rec.members[0]
  await put(env, `shproj:${id}`, rec)
  return { ok: true }
}
