// Todo lo social entre amigos. En KV:
//   "posts:<id>"     -> [post]   lo que compartes (en el feed o a personas concretas)
//   "social:<id>"    -> { birthday, shareMood, shareTower, tower, unlocks, gifts, session }
//   "challenge:<cid>" y "challenges:<id>" -> retos y los retos de cada uno
// Solo los amigos ven lo tuyo, y solo lo que tú compartes.
import { getFriendIds, getUsername, findUserId, normalizeUsername } from './friends.js'
import { getProfile } from './profile.js'
import { listEntries } from './entries.js'

export const EMOJIS = ['👏', '🔥', '❤️', '😂']
export const KINDS = ['recipe', 'doc', 'good', 'note', 'achievement']
export const METRICS = { workouts: 'Entrenos', water: 'Días con el agua cumplida', habits: 'Hábitos cumplidos', focus: 'Sesiones de foco' }
// Accesorios exclusivos: se consiguen con secretos, por tu cumpleaños o como regalo
export const SECRETS = { halo: 'Cerrar 3 días', starclip: 'Cerrar 10 días', partyhat: 'Tu cumpleaños', sprout: 'Compartir algo por primera vez' }
const MAX_POSTS = 100
const MAX_TEXT = 300
const MAX_DATA = 20_000

const get = async (env, key, fallback) => (await env.DATA.get(key, 'json')) ?? fallback
const put = (env, key, value) => env.DATA.put(key, JSON.stringify(value))
const id = () => crypto.randomUUID()
const clip = (t, n = MAX_TEXT) => (typeof t === 'string' ? t.trim().slice(0, n) : '')
const DEFAULT_SOCIAL = { birthday: null, shareMood: true, shareTower: true, tower: [], unlocks: [], gifts: [], session: null }
export const getSocial = async (env, uid) => ({ ...DEFAULT_SOCIAL, ...(await get(env, `social:${uid}`, {})) })
const saveSocial = (env, uid, s) => put(env, `social:${uid}`, s)
const weekStartOf = (iso) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10) }
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const board = (env, uid, area) => get(env, `board:${uid}:${area}`, { data: {} })

async function publicUser(env, uid, cache) {
  if (cache.has(uid)) return cache.get(uid)
  const u = { username: await getUsername(env, uid), avatar: (await getProfile(env, uid)).avatar }
  cache.set(uid, u)
  return u
}
/** Desbloquea un accesorio exclusivo. Devuelve su id si es nuevo. */
async function unlock(env, uid, item, social) {
  const s = social ?? (await getSocial(env, uid))
  if (s.unlocks.includes(item)) return null
  s.unlocks = [...s.unlocks, item]
  if (!social) await saveSocial(env, uid, s)
  return item
}

// ---------- Retos: progreso real a partir de los tableros ----------
async function progress(env, uid, metric, weekStart) {
  const end = addDays(weekStart, 7)
  const inWeek = (d) => d >= weekStart && d < end
  if (metric === 'workouts') return ((await board(env, uid, 'salud')).data.workouts ?? []).filter((w) => inWeek(w.date)).length
  if (metric === 'water') { const d = (await board(env, uid, 'salud')).data; const goal = d.waterGoal ?? 8; return Object.entries(d.water ?? {}).filter(([k, v]) => inWeek(k) && v >= goal).length }
  if (metric === 'habits') return Object.values((await board(env, uid, 'journal')).data.pixels ?? {}).flat().filter(inWeek).length
  if (metric === 'focus') return Object.entries((await board(env, uid, 'trabajo')).data.focus ?? {}).filter(([k]) => inWeek(k)).reduce((s, [, n]) => s + n, 0)
  return 0
}

const AREA_COLORS = { estudios: '#3185FC', salud: '#3DDC97', journal: '#F9DC5C', trabajo: '#E84855', comida: '#EFABFF' }

/**
 * ¿Has tachado TODO lo de hoy? Lo comprueba el servidor con tus datos (lo mismo que enseña Inicio),
 * así nadie puede apilar bloques sin hacer nada. Devuelve cuántas cosas había y el área que más has movido.
 */
async function dayStatus(env, uid, today) {
  const b = {}
  for (const a of Object.keys(AREA_COLORS)) b[a] = (await board(env, uid, a)).data ?? {}
  const items = [] // { area, done }
  for (const e of await listEntries(env, uid)) if (e.date === today || (e.date && e.date < today && !e.done)) items.push({ area: e.area, done: e.done })
  for (const p of b.trabajo.projects ?? []) for (const t of p.tasks ?? []) {
    if (!t.due || t.due > today || (t.status === 'done' && t.doneAt !== today)) continue
    items.push({ area: 'trabajo', done: t.status === 'done' })
  }
  for (const m of b.trabajo.meetings ?? []) if (m.date === today) items.push({ area: 'trabajo', done: Boolean(m.done) })
  const dayIdx = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  const session = b.salud.plan?.[dayIdx]
  if (session && session !== 'Descanso') items.push({ area: 'salud', done: Boolean(b.salud.planDone?.[today]) })
  for (const a of b.estudios.assignments ?? []) if (!(a.due > today || (a.done && a.doneAt !== today))) items.push({ area: 'estudios', done: Boolean(a.done) })
  for (const h of b.journal.habits ?? []) items.push({ area: 'journal', done: (b.journal.pixels?.[h.id] ?? []).includes(today) })
  for (const [meal, dish] of Object.entries(b.comida.menu?.[today] ?? {})) if (dish) items.push({ area: 'comida', done: Boolean(b.comida.mealsDone?.[today]?.[meal]) })
  const count = {}
  items.forEach((i) => { if (i.done) count[i.area] = (count[i.area] ?? 0) + 1 })
  const top = Object.entries(count).sort((x, y) => y[1] - x[1])[0]?.[0]
  return { total: items.length, done: items.filter((i) => i.done).length, color: AREA_COLORS[top] ?? '#3185FC' }
}

/** Todo lo que ve la pantalla de Amigos. `today` lo manda el navegador (fecha local). */
export async function socialState(env, me, today) {
  const cache = new Map()
  const friends = await getFriendIds(env, me)
  const mine = await getSocial(env, me)
  const mmdd = today.slice(5)
  const tomorrow = addDays(today, 1).slice(5)

  // Tu cumpleaños: gorro de fiesta para siempre
  if (mine.birthday === mmdd && !mine.unlocks.includes('partyhat')) { mine.unlocks.push('partyhat'); await saveSocial(env, me, mine) }

  const people = []
  for (const f of friends) {
    const s = await getSocial(env, f)
    const u = await publicUser(env, f, cache)
    if (!u.username) continue
    const mood = s.shareMood ? (await board(env, f, 'journal')).data.moods?.[today] ?? null : null
    const live = s.session && s.session.endsAt > Date.now() ? s.session : null
    people.push({ ...u, mood, tower: s.shareTower ? s.tower.slice(-60) : [], birthday: s.birthday === mmdd ? 'today' : s.birthday === tomorrow ? 'tomorrow' : null, session: live })
  }

  // Feed: lo tuyo y lo que tus amigos comparten contigo o con todos, más reciente primero
  const feed = []
  for (const uid of [me, ...friends]) {
    for (const p of await get(env, `posts:${uid}`, [])) {
      if (uid !== me && p.to !== 'feed' && !p.to.includes(me)) continue
      const reactions = Object.fromEntries(EMOJIS.map((e) => [e, { n: (p.reactions?.[e] ?? []).length, mine: (p.reactions?.[e] ?? []).includes(me) }]))
      const comments = await Promise.all((p.comments ?? []).map(async (c) => ({ id: c.id, text: c.text, at: c.at, from: await publicUser(env, c.from, cache) })))
      feed.push({ id: p.id, kind: p.kind, data: p.data, text: p.text, at: p.at, mine: uid === me, private: p.to !== 'feed', from: await publicUser(env, uid, cache), reactions, comments })
    }
  }
  feed.sort((a, b) => b.at - a.at)

  // Retos en los que estás
  const challenges = []
  for (const cid of await get(env, `challenges:${me}`, [])) {
    const c = await get(env, `challenge:${cid}`, null)
    if (!c) continue
    const ws = weekStartOf(today)
    const members = await Promise.all(c.members.map(async (m) => ({ ...(await publicUser(env, m, cache)), me: m === me, accepted: c.accepted.includes(m), value: await progress(env, m, c.metric, ws) })))
    challenges.push({ id: c.id, title: c.title, metric: c.metric, target: c.target, owner: (await publicUser(env, c.owner, cache)).username, members, accepted: c.accepted.includes(me) })
  }

  const gifts = await Promise.all(mine.gifts.filter((g) => !g.seen).map(async (g) => ({ ...g, from: await publicUser(env, g.from, cache) })))
  return {
    me: { birthday: mine.birthday, shareMood: mine.shareMood, shareTower: mine.shareTower, tower: mine.tower, unlocks: mine.unlocks, session: mine.session && mine.session.endsAt > Date.now() ? mine.session : null, isBirthday: mine.birthday === mmdd },
    friends: people, feed: feed.slice(0, 80), challenges, gifts,
  }
}

/** Acciones. Devuelve { error } o { ok, ...extra }. */
export async function act(env, me, body, today) {
  const a = body?.action
  const audience = async (to) => {
    if (to === 'feed') return 'feed'
    const ids = []
    const friends = await getFriendIds(env, me)
    for (const name of Array.isArray(to) ? to.slice(0, 20) : []) { const uid = await findUserId(env, normalizeUsername(name)); if (uid && friends.includes(uid)) ids.push(uid) }
    return ids.length ? ids : null
  }

  if (a === 'post') {
    if (!KINDS.includes(body.kind)) return { error: 'Tipo no válido' }
    const data = body.data ?? {}
    if (JSON.stringify(data).length > MAX_DATA) return { error: 'Es demasiado grande para compartir' }
    const to = await audience(body.to)
    if (!to) return { error: 'Elige el feed o algún amigo' }
    const list = await get(env, `posts:${me}`, [])
    list.unshift({ id: id(), kind: body.kind, data, text: clip(body.text), to, at: Date.now(), reactions: {}, comments: [] })
    await put(env, `posts:${me}`, list.slice(0, MAX_POSTS))
    const s = await getSocial(env, me)
    const unlocked = await unlock(env, me, 'sprout', s)
    if (unlocked) await saveSocial(env, me, s)
    return { ok: true, unlocked }
  }
  if (a === 'unpost') {
    const list = await get(env, `posts:${me}`, [])
    await put(env, `posts:${me}`, list.filter((p) => p.id !== body.id))
    return { ok: true }
  }
  if (a === 'react' || a === 'comment') {
    const owner = await findUserId(env, normalizeUsername(body.owner))
    if (!owner || (owner !== me && !(await getFriendIds(env, me)).includes(owner))) return { error: 'No puedes' }
    const list = await get(env, `posts:${owner}`, [])
    const p = list.find((x) => x.id === body.id)
    if (!p || (owner !== me && p.to !== 'feed' && !p.to.includes(me))) return { error: 'No existe' }
    if (a === 'react') {
      if (!EMOJIS.includes(body.emoji)) return { error: 'Emoji no válido' }
      const who = p.reactions?.[body.emoji] ?? []
      p.reactions = { ...(p.reactions ?? {}), [body.emoji]: who.includes(me) ? who.filter((x) => x !== me) : [...who, me] }
    } else {
      const text = clip(body.text, 200)
      if (!text) return { error: 'Comentario vacío' }
      p.comments = [...(p.comments ?? []), { id: id(), from: me, text, at: Date.now() }].slice(-50)
    }
    await put(env, `posts:${owner}`, list)
    return { ok: true }
  }
  if (a === 'settings') {
    const s = await getSocial(env, me)
    if ('birthday' in body) s.birthday = /^\d{2}-\d{2}$/.test(body.birthday ?? '') ? body.birthday : null
    if ('shareMood' in body) s.shareMood = body.shareMood === true
    if ('shareTower' in body) s.shareTower = body.shareTower === true
    await saveSocial(env, me, s)
    return { ok: true }
  }
  if (a === 'closeDay') {
    // Solo hoy (con un día de margen por la zona horaria), y solo si de verdad está todo hecho
    const server = new Date().toISOString().slice(0, 10)
    if (today < addDays(server, -1) || today > addDays(server, 1)) return { error: 'Solo se puede cerrar el día de hoy' }
    const s = await getSocial(env, me)
    if (s.tower.some((b) => b.date === today)) return { ok: true, already: true }
    const st = await dayStatus(env, me, today)
    if (!st.total || st.done < st.total) return { error: 'Aún te quedan cosas por hacer hoy', done: st.done, total: st.total }
    s.tower = [...s.tower, { date: today, color: st.color }].slice(-400)
    let unlocked = null
    if (s.tower.length >= 3) unlocked = await unlock(env, me, 'halo', s)
    if (s.tower.length >= 10) unlocked = (await unlock(env, me, 'starclip', s)) ?? unlocked
    await saveSocial(env, me, s)
    return { ok: true, blocks: s.tower.length, unlocked }
  }
  if (a === 'gift') {
    const s = await getSocial(env, me)
    if (!s.unlocks.includes(body.item)) return { error: 'No tienes ese accesorio' }
    const to = await findUserId(env, normalizeUsername(body.to))
    if (!to || !(await getFriendIds(env, me)).includes(to)) return { error: 'Solo a tus amigos' }
    const r = await getSocial(env, to)
    if (!r.unlocks.includes(body.item)) r.unlocks = [...r.unlocks, body.item]
    r.gifts = [...r.gifts, { id: id(), from: me, item: body.item, text: clip(body.text, 120), at: Date.now(), seen: false }].slice(-50)
    await saveSocial(env, to, r)
    return { ok: true }
  }
  if (a === 'seenGifts') {
    const s = await getSocial(env, me)
    s.gifts = s.gifts.map((g) => ({ ...g, seen: true }))
    await saveSocial(env, me, s)
    return { ok: true }
  }
  if (a === 'challenge') {
    if (!METRICS[body.metric]) return { error: 'Tipo de reto no válido' }
    const target = Math.max(1, Math.min(100, Math.round(Number(body.target) || 0)))
    const to = await audience(body.to)
    if (!Array.isArray(to)) return { error: 'Elige al menos un amigo' }
    const c = { id: id(), owner: me, title: clip(body.title, 60) || METRICS[body.metric], metric: body.metric, target, members: [me, ...to], accepted: [me], at: Date.now() }
    await put(env, `challenge:${c.id}`, c)
    for (const m of c.members) { const l = await get(env, `challenges:${m}`, []); await put(env, `challenges:${m}`, [c.id, ...l].slice(0, 30)) }
    return { ok: true }
  }
  if (a === 'joinChallenge' || a === 'leaveChallenge') {
    const c = await get(env, `challenge:${body.id}`, null)
    if (!c || !c.members.includes(me)) return { error: 'No existe' }
    if (a === 'joinChallenge') { if (!c.accepted.includes(me)) c.accepted.push(me); await put(env, `challenge:${c.id}`, c) }
    else {
      c.members = c.members.filter((m) => m !== me); c.accepted = c.accepted.filter((m) => m !== me)
      await put(env, `challenge:${c.id}`, c)
      const l = await get(env, `challenges:${me}`, []); await put(env, `challenges:${me}`, l.filter((x) => x !== c.id))
    }
    return { ok: true }
  }
  if (a === 'session') {
    const s = await getSocial(env, me)
    const minutes = Math.max(5, Math.min(120, Math.round(Number(body.minutes) || 25)))
    s.session = body.stop ? null : { label: clip(body.label, 40), startedAt: Date.now(), endsAt: Number(body.endsAt) > Date.now() ? Math.min(Number(body.endsAt), Date.now() + 120 * 60000) : Date.now() + minutes * 60000, minutes }
    await saveSocial(env, me, s)
    return { ok: true, session: s.session }
  }
  return { error: 'Acción no válida' }
}
