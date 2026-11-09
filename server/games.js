// Juegos del día que necesitan palabras: Spelling Bee y mini crucigrama.
// Se crean UNA vez al día por idioma con la IA, el servidor los comprueba y se guardan en KV:
//   "game:<juego>:<idioma>:<fecha>"  → el mismo reto para todo el mundo ese día.
import { groqChat } from './groq.js'

// Mayúsculas sin tildes, pero la Ñ se queda (es una letra más en español)
const strip = (w) => String(w ?? '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '')
const parse = (t) => { try { return JSON.parse(t) } catch { const a = t.indexOf('{'); const b = t.lastIndexOf('}'); try { return JSON.parse(t.slice(a, b + 1)) } catch { return null } } }
const LANG = { es: 'español', en: 'English' }

// ---------- Spelling Bee ----------
/** Comprueba y limpia un panal: 7 letras distintas, la central en todas las palabras, solo esas letras, 4+ letras. */
export function cleanBee(raw) {
  const letters = [...new Set(strip(raw?.letters ?? '').split(''))]
  const center = strip(raw?.center ?? '')[0]
  if (letters.length !== 7 || !center || !letters.includes(center)) return null
  const set = new Set(letters)
  const words = [...new Set((raw.words ?? []).map(strip))].filter((w) => w.length >= 4 && w.includes(center) && [...w].every((c) => set.has(c)))
  if (words.length < 12) return null
  const pangrams = words.filter((w) => letters.every((l) => w.includes(l)))
  if (!pangrams.length) return null
  return { letters: letters.filter((l) => l !== center), center, words: words.sort(), pangrams }
}

async function makeBee(env, lang) {
  const sys = `Create a Spelling Bee puzzle in ${LANG[lang]}. Pick 7 different letters (one is the center) so that there is at least one common ${LANG[lang]} word (a "pangram") using all 7. List 20 to 40 common, real ${LANG[lang]} words of 4+ letters that use ONLY those letters (letters can repeat) and ALWAYS contain the center letter. No proper nouns, no plurals of rare words, no conjugations nobody uses. Answer only JSON: {"letters":"ABCDEFG","center":"A","words":["...","..."]}`
  for (let i = 0; i < 3; i++) {
    const bee = cleanBee(parse(await groqChat([{ role: 'system', content: sys }, { role: 'user', content: `Seed ${Math.random().toString(36).slice(2, 8)}` }], env, { json: true, temperature: 0.9 })))
    if (bee) return bee
  }
  throw new Error('No he podido crear el panal de hoy')
}

// ---------- Mini crucigrama ----------
/**
 * Coloca palabras en una rejilla cruzándolas (como un crucigrama de verdad) y numera las pistas.
 * Lo hace nuestro código, así la rejilla siempre cuadra. Devuelve null si no caben suficientes cruzadas.
 */
export function buildCrossword(entries, size = 7, shuffle = 0) {
  const list = entries.map((e) => ({ answer: strip(e.answer), clue: String(e.clue ?? '').slice(0, 120) })).filter((e) => e.answer.length >= 3 && e.answer.length <= size && e.clue)
  list.sort((a, b) => b.answer.length - a.answer.length)
  // Distintos órdenes dan rejillas distintas: el primero fijo (la más larga en el centro), el resto barajado
  for (let i = list.length - 1; i > 1 && shuffle; i--) { const j = 1 + ((i * 7 + shuffle * 13) % i); [list[i], list[j]] = [list[j], list[i]] }
  const grid = Array.from({ length: size }, () => Array(size).fill(null))
  const placed = []
  const fits = (w, r, c, dir) => {
    const dr = dir === 'down' ? 1 : 0; const dc = dir === 'across' ? 1 : 0
    const er = r + dr * (w.length - 1); const ec = c + dc * (w.length - 1)
    if (r < 0 || c < 0 || er >= size || ec >= size) return -1
    // casilla antes y después libres
    const br = r - dr; const bc = c - dc; const ar = er + dr; const ac = ec + dc
    if (br >= 0 && bc >= 0 && grid[br][bc]) return -1
    if (ar < size && ac < size && grid[ar]?.[ac]) return -1
    let crosses = 0
    for (let i = 0; i < w.length; i++) {
      const rr = r + dr * i; const cc = c + dc * i
      const cell = grid[rr][cc]
      if (cell) { if (cell !== w[i]) return -1; crosses++; continue }
      // vecinos laterales vacíos (no pegar palabras en paralelo)
      const n1 = dir === 'across' ? grid[rr - 1]?.[cc] : grid[rr][cc - 1]
      const n2 = dir === 'across' ? grid[rr + 1]?.[cc] : grid[rr][cc + 1]
      if (n1 || n2) return -1
    }
    return crosses
  }
  const put = (e, r, c, dir) => { for (let i = 0; i < e.answer.length; i++) grid[r + (dir === 'down' ? i : 0)][c + (dir === 'across' ? i : 0)] = e.answer[i]; placed.push({ ...e, r, c, dir }) }
  if (!list.length) return null
  put(list[0], Math.floor(size / 2), Math.floor((size - list[0].answer.length) / 2), 'across')
  for (const e of list.slice(1)) {
    let best = null
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) for (const dir of ['across', 'down']) {
      const x = fits(e.answer, r, c, dir)
      if (x > 0 && (!best || x > best.x)) best = { r, c, dir, x }
    }
    if (best) put(e, best.r, best.c, best.dir)
  }
  if (placed.length < 5) return null
  // Recortar a lo usado y numerar
  const rows = placed.flatMap((p) => [p.r, p.r + (p.dir === 'down' ? p.answer.length - 1 : 0)])
  const cols = placed.flatMap((p) => [p.c, p.c + (p.dir === 'across' ? p.answer.length - 1 : 0)])
  const r0 = Math.min(...rows); const c0 = Math.min(...cols)
  const h = Math.max(...rows) - r0 + 1; const w = Math.max(...cols) - c0 + 1
  const starts = [...placed].map((p) => ({ ...p, r: p.r - r0, c: p.c - c0 })).sort((a, b) => a.r - b.r || a.c - b.c)
  let n = 0
  const numAt = {}
  for (const p of starts) { const k = `${p.r},${p.c}`; numAt[k] ??= ++n; p.n = numAt[k] }
  const cells = Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => grid[r + r0][c + c0]))
  return { w, h, cells: cells.map((row) => row.map((x) => (x ? 1 : 0))), solution: cells.map((row) => row.map((x) => x ?? '')), clues: starts.map(({ n: num, dir, r, c, clue, answer }) => ({ n: num, dir, r, c, len: answer.length, clue })) }
}

/** Prueba varios órdenes y se queda con la rejilla que más palabras cruza. */
export function bestCrossword(entries) {
  let best = null
  for (let k = 0; k < 40; k++) { const cw = buildCrossword(entries, 7, k); if (cw && (!best || cw.clues.length > best.clues.length)) best = cw }
  return best
}

async function makeCrossword(env, lang) {
  const sys = `Write 14 entries for a small crossword in ${LANG[lang]}: common words of 3 to 7 letters (no spaces, no proper nouns) with a short, clever, general-knowledge clue each (culture, science, language, everyday life). Answer only JSON: {"entries":[{"answer":"...","clue":"..."}]}`
  for (let i = 0; i < 3; i++) {
    const raw = parse(await groqChat([{ role: 'system', content: sys }, { role: 'user', content: `Seed ${Math.random().toString(36).slice(2, 8)}` }], env, { json: true, temperature: 0.9 }))
    const cw = bestCrossword(raw?.entries ?? [])
    if (cw) return cw
  }
  throw new Error('No he podido crear el crucigrama de hoy')
}

const MAKERS = { bee: makeBee, crossword: makeCrossword }
/** El juego del día (creado la primera vez que alguien lo pide ese día, y guardado). */
export async function dailyGame(env, game, lang, date) {
  const key = `game:${game}:${lang}:${date}`
  const cached = await env.DATA.get(key, 'json')
  if (cached) return cached
  const made = { ...(await MAKERS[game](env, lang)), date, lang }
  await env.DATA.put(key, JSON.stringify(made), { expirationTtl: 60 * 60 * 24 * 21 })
  return made
}
export const isGame = (g) => g in MAKERS
