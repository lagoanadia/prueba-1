import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { merge3 } from '../lib/merge3.js'
import { createShared, inviteShared, leaveShared, listShared, restoreSharedVersion, saveShared, saveSharedVersion } from '../services/projectsService.js'

const POLL_MS = 5000 // cada cuánto se miran los cambios de los demás
const SAVE_MS = 700 // espera antes de guardar mis cambios (así no se manda uno por tecla)

/**
 * Proyectos de Trabajo compartidos con amigos.
 * Viven en el servidor (no en el tablero de cada uno) y se "inyectan" en data.projects con `shared: true`,
 * así todas las funciones de Trabajo (tareas, hitos, documentos, tiempo...) funcionan igual sin tocarlas.
 * Mis cambios se guardan solos; los de los demás llegan cada pocos segundos y se fusionan con los míos.
 */
export default function useSharedProjects(data, update) {
  const [shared, setSharedState] = useState([]) // [{ id, project, base, rev, dirty, meta }]
  const [error, setError] = useState('')
  const sRef = useRef([])
  const dataRef = useRef(data)
  dataRef.current = data
  const timers = useRef(new Map())
  const saving = useRef(new Set())
  const setShared = (next) => { sRef.current = next; setSharedState(next) }

  const refresh = useCallback(async () => {
    try {
      const { projects } = await listShared()
      const cur = new Map(sRef.current.map((r) => [r.id, r]))
      setShared(projects.map((s) => {
        const meta = { mine: s.mine, members: s.members, versions: s.versions, dirty: s.dirty, lastEdit: s.lastEdit }
        const mine = cur.get(s.id)
        if (!mine) return { id: s.id, project: s.project, base: s.project, rev: s.rev, dirty: false, meta }
        if (s.rev === mine.rev) return { ...mine, meta }
        if (!mine.dirty && !saving.current.has(s.id)) return { id: s.id, project: s.project, base: s.project, rev: s.rev, dirty: false, meta }
        // Tengo cambios sin guardar: los junto con lo nuevo de los demás
        return { ...mine, project: merge3(mine.base, mine.project, s.project), base: s.project, rev: s.rev, meta }
      }))
      setError('')
    } catch (e) { if (e.status !== 401) setError(e.message) }
  }, [])

  useEffect(() => {
    refresh()
    const tick = () => { if (!document.hidden) refresh() }
    const id = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [refresh])

  const flush = useCallback(async (id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    const r = sRef.current.find((x) => x.id === id)
    if (!r || !r.dirty) return
    if (saving.current.has(id)) { timers.current.set(id, setTimeout(() => flush(id), SAVE_MS)); return }
    saving.current.add(id)
    const sent = r.project
    try {
      const res = await saveShared(id, r.base, sent)
      const cur = sRef.current.find((x) => x.id === id)
      if (!cur) return
      const unchanged = cur.project === sent
      const project = unchanged ? res.project : merge3(sent, cur.project, res.project) // si he seguido editando, lo junto
      setShared(sRef.current.map((x) => (x.id === id ? { ...x, project, base: res.project, rev: res.rev, dirty: !unchanged, meta: { ...x.meta, dirty: true } } : x)))
      if (!unchanged) timers.current.set(id, setTimeout(() => flush(id), SAVE_MS))
      setError('')
    } catch (e) {
      setError(e.message || 'No se ha podido guardar')
      timers.current.set(id, setTimeout(() => flush(id), POLL_MS))
    } finally { saving.current.delete(id) }
  }, [])

  useEffect(() => () => { for (const t of timers.current.values()) clearTimeout(t) }, [])

  const inject = (d, list) => ({ ...d, projects: [...(d.projects ?? []).filter((p) => !p.shared), ...list.map((r) => ({ ...r.project, id: r.id, shared: true }))] })

  // Igual que update, pero separa lo compartido: eso va al servidor y el resto al tablero de siempre
  const wrapped = (fn) => {
    const after = fn(inject(dataRef.current, sRef.current))
    const afterShared = new Map((after.projects ?? []).filter((p) => p.shared).map((p) => [p.id, p]))
    const next = []
    for (const r of sRef.current) {
      const p = afterShared.get(r.id)
      if (!p) { leaveShared(r.id).catch((e) => setError(e.message)); continue } // lo han quitado de la lista: salgo del proyecto
      const { shared: _flag, ...body } = p
      if (JSON.stringify(body) === JSON.stringify(r.project)) { next.push(r); continue }
      next.push({ ...r, project: body, dirty: true })
      clearTimeout(timers.current.get(r.id))
      timers.current.set(r.id, setTimeout(() => flush(r.id), SAVE_MS))
    }
    const local = { ...after, projects: (after.projects ?? []).filter((p) => !p.shared) }
    dataRef.current = local
    setShared(next)
    update(() => local)
  }

  const api = useMemo(() => ({
    meta: (id) => sRef.current.find((r) => r.id === id)?.meta ?? null,
    create: async (project, members) => { const { project: s } = await createShared(project, members); await refresh(); return s.id },
    saveVersion: async (id, note) => { await flush(id); await saveSharedVersion(id, note); await refresh() },
    restore: async (id, n) => { await flush(id); await restoreSharedVersion(id, n); await refresh() },
    invite: async (id, members) => { await inviteShared(id, members); await refresh() },
    me: shared.map((r) => r.meta.members.find((m) => m.you)?.username).find(Boolean) ?? null, // mi nombre de usuario (si estoy en algún proyecto compartido)
    error,
  }), [shared, error, refresh, flush]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data: useMemo(() => inject(data, shared), [data, shared]), update: wrapped, api }
}
