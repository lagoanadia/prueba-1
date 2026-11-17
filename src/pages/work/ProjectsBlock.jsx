import { useEffect, useState } from 'react'
import { undoable, insertAt } from '../../lib/undo.js'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { getFriends } from '../../services/friendsService.js'
import Empty from './Empty.jsx'
import { useShared } from './SharedCtx.js'
import { formatShort, daysUntil } from '../../lib/dates.js'
import { progressOf, projectsOf } from '../../widgets/trabajo/projects.js'
import { PROJECT_COLORS, colorOf, soft } from './shared.js'

/** Proyectos: cada uno con su color, plazo y progreso. Tocar uno lo abre por dentro. */
export default function ProjectsBlock({ data, update, openProject }) {
  const projects = projectsOf(data)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const sh = useShared()
  const [withFriends, setWithFriends] = useState(false) // proyecto colaborativo
  const [friends, setFriends] = useState([])
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { if (withFriends && !friends.length) getFriends().then((r) => setFriends(r.friends ?? [])).catch(() => {}) }, [withFriends]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = crypto.randomUUID()
    if (withFriends && picked.length) { // colaborativo: se crea en el servidor y los amigos lo ven al momento
      setBusy(true); setErr('')
      try {
        await sh.create({ id, name: name.trim(), createdAt: new Date().toLocaleDateString('en-CA'), color: PROJECT_COLORS[projectsOf(data).length % PROJECT_COLORS.length], deadline: null, tasks: [] }, picked)
        setName(''); setAdding(false); setWithFriends(false); setPicked([])
      } catch (er) { setErr(er.message) } finally { setBusy(false) }
      return
    }
    update((d) => ({ ...d, projects: [...projectsOf(d), { id, name: name.trim(), createdAt: new Date().toLocaleDateString('en-CA'), color: PROJECT_COLORS[projectsOf(d).length % PROJECT_COLORS.length], deadline: null, tasks: [] }] }))
    setName('')
    setAdding(false)
  }
  const setDeadline = (id, deadline) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, deadline } : p)) }))
  const remove = (p) => {
    if (p.shared && !window.confirm(`¿Salir de «${p.name}»? Los demás lo siguen teniendo.`)) return // salir de uno compartido no se puede deshacer desde aquí
    const idx = projects.findIndex((x) => x.id === p.id)
    const wasSelected = (data.selectedProjects ?? []).includes(p.id)
    update((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== p.id), selectedProjects: (d.selectedProjects ?? []).filter((x) => x !== p.id) }))
    if (!p.shared) undoable(`«${p.name}» eliminado${p.tasks.length ? ` con sus ${p.tasks.length} tareas` : ''}`, () => update((d) => ({ ...d, projects: insertAt(d.projects, p, idx), selectedProjects: wasSelected ? [...new Set([...(d.selectedProjects ?? []), p.id])] : d.selectedProjects ?? [] })))
  }

  return (
    <div className="wk-projects">
      {projects.length === 0 && !adding && <Empty icon="trabajo" text="Crea tu primer proyecto, solo o con amigos" action="Nuevo proyecto" onAction={() => setAdding(true)} />}
      <div className="wk-chips">
        {projects.map((p, i) => {
          const c = colorOf(data, p.id)
          const { total, done, pct } = progressOf(p)
          const left = p.deadline ? daysUntil(p.deadline) : null
          return (
            <div key={p.id} className="wk-project on" style={{ '--c': c, '--i': i }}>
              <button className="wk-project-main" onClick={() => openProject(p.id)} title="Abrir proyecto">
                <span className="dot" style={{ background: c }} />
                <b>{p.name}</b>
                <span className="wk-pct">{pct}%</span>
                <span className="bar"><span style={{ width: `${pct}%`, background: c }} /></span>
                <span className="muted wk-meta"><Icon name="check" size={14} />{done}/{total}
                  {p.shared && <span className="wk-shared" title="Proyecto con amigos">{(sh.meta(p.id)?.members ?? []).slice(0, 3).map((m) => <Avatar key={m.username} avatar={m.avatar} size={16} />)}</span>}
                </span>
              </button>
              <label className={`wk-deadline ${left != null && left < 0 && pct < 100 ? 'is-late' : ''}`} title="Fecha límite" style={{ background: soft(c, 25) }}>
                <Icon name="calendario" size={14} />{p.deadline ? formatShort(p.deadline).replace(/^\S+ /, '') : '—'}
                <input type="date" value={p.deadline ?? ''} onChange={(e) => setDeadline(p.id, e.target.value || null)} aria-label={`Fecha límite de ${p.name}`} />
              </label>
              <button className="wk-x" onClick={() => remove(p)} aria-label={p.shared ? `Salir de ${p.name}` : `Borrar ${p.name}`} title={p.shared ? 'Salir del proyecto' : 'Borrar'}><Icon name="close" size={12} /></button>
            </div>
          )
        })}
        {adding ? (
          <form className="wk-add wk-add-card" onSubmit={add}>
            <input autoFocus placeholder="Nombre del proyecto" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Nombre del proyecto" />
            <div className="wk-who" role="group" aria-label="Quién participa">
              <button type="button" className={!withFriends ? 'on' : ''} aria-pressed={!withFriends} onClick={() => setWithFriends(false)}><Icon name="perfil" size={16} />Solo yo</button>
              <button type="button" className={withFriends ? 'on' : ''} aria-pressed={withFriends} onClick={() => setWithFriends(true)}><Icon name="amigos" size={16} />Con amigos</button>
            </div>
            {withFriends && (
              <div className="wk-friends" role="group" aria-label="Con quién">
                {friends.length === 0 && <span className="muted">Aún no tienes amigos añadidos</span>}
                {friends.map((f) => (
                  <button type="button" key={f.username} className={`wk-friend ${picked.includes(f.username) ? 'on' : ''}`} aria-pressed={picked.includes(f.username)}
                    onClick={() => setPicked(picked.includes(f.username) ? picked.filter((x) => x !== f.username) : [...picked, f.username])}>
                    <Avatar avatar={f.avatar} size={22} />{f.username}
                  </button>
                ))}
              </div>
            )}
            {err && <span className="wk-err" role="alert">{err}</span>}
            <div className="wk-add-actions">
              <button type="button" className="wk-cancel" onClick={() => { setAdding(false); setName(''); setWithFriends(false); setPicked([]); setErr('') }}>Cancelar</button>
              <button className="pill sh-save" disabled={!name.trim() || busy || (withFriends && !picked.length)}><Icon name="check" size={16} color="#fff" />Crear</button>
            </div>
          </form>
        ) : (
          <button className="icon-btn wk-plus" onClick={() => setAdding(true)} aria-label="Nuevo proyecto" title="Nuevo proyecto"><Icon name="plus" size={20} /></button>
        )}
      </div>
    </div>
  )
}
