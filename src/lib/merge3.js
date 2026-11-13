// Fusión de tres vías para proyectos compartidos (la usan el frontend y el Worker).
// base = lo último que yo había recibido · mine = mi versión con mis cambios · theirs = lo que hay ahora en el servidor.
// Lo que solo cambia uno, se queda; si cambian los dos lo mismo, gana lo mío. Las listas con `id`
// (tareas, documentos, hitos...) se fusionan elemento a elemento, así dos personas pueden añadir tareas a la vez.
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const idList = (a) => Array.isArray(a) && a.every((x) => isObj(x) && typeof x.id === 'string')

export function merge3(base, mine, theirs) {
  if (same(mine, base)) return theirs // yo no he tocado esto: me quedo con lo de los demás
  if (same(theirs, base) || same(mine, theirs)) return mine
  if (isObj(base) && isObj(mine) && isObj(theirs)) {
    const out = {}
    for (const k of new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)])) {
      const v = merge3(base[k], mine[k], theirs[k])
      if (v !== undefined) out[k] = v
    }
    return out
  }
  if (idList(base) && idList(mine) && idList(theirs)) {
    const by = (a) => new Map(a.map((x) => [x.id, x]))
    const B = by(base), M = by(mine), T = by(theirs)
    const out = []
    const seen = new Set()
    for (const { id } of [...theirs, ...mine]) {
      if (seen.has(id)) continue
      seen.add(id)
      const b = B.get(id), m = M.get(id), t = T.get(id)
      if (!b) { out.push(t ?? m); continue } // nuevo (de uno u otro)
      if (!m) { if (!same(t, b)) out.push(t); continue } // lo borré yo: fuera, salvo que otro lo haya cambiado
      if (!t) { if (!same(m, b)) out.push(m); continue } // lo borró otro: fuera, salvo que yo lo haya cambiado
      out.push(merge3(b, m, t))
    }
    return out
  }
  return mine
}
