import Select from '../../components/Select.jsx'
import Avatar from '../../components/Avatar.jsx'
import { useShared } from './SharedCtx.js'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Empty from './Empty.jsx'
import Icon from '../../components/Icon.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'
import { STATES, projectsOf, updateTask } from '../../widgets/trabajo/projects.js'
import TaskEditor from './TaskEditor.jsx'
import { colorOf, selectedOf, soft } from './shared.js'

const PRIORITY = { alta: '#E84855', media: '#F9DC5C', baja: '#3DDC97' }
const PRIORITY_WORD = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const LONG_PRESS = 260 // ms: en táctil hay que mantener pulsado para arrastrar (si no, la página se desplaza)

/**
 * Tablero: arrastra una tarea a otra columna para cambiar su estado; tócala para abrir su ficha.
 * Arriba, chips de proyecto para elegir qué proyectos se ven (se pueden mezclar).
 */
export default function BoardBlock({ data, update, onlyProject = null }) {
  const today = todayISO()
  const projects = projectsOf(data)
  const selected = onlyProject ? [onlyProject] : selectedOf(data)
  const shown = projects.filter((p) => selected.includes(p.id))
  const mixed = shown.length > 1
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [target, setTarget] = useState('')
  const [editing, setEditing] = useState(null) // { projectId, taskId }
  const [drag, setDrag] = useState(null) // { task, x, y, w, over }
  const press = useRef(null)
  const projectFor = shown.find((p) => p.id === target) ?? shown[0]
  const sh = useShared()
  const sharedProject = onlyProject ? projects.find((p) => p.id === onlyProject && p.shared) : null
  const members = sharedProject ? sh.meta(sharedProject.id)?.members ?? [] : []
  const me = members.find((m) => m.you)?.username ?? null
  const [who, setWho] = useState('all') // todo · mis tareas · las del resto
  const [over, setOver] = useState(null) // a quién se está soltando una tarea
  const setOverRef = useRef(setOver)
  const assignRef = useRef(null)
  const assign = (taskId, assignee) => update((d) => updateTask(d, sharedProject.id, taskId, { assignee: assignee || null }))
  assignRef.current = sharedProject ? assign : null
  const mineOf = (t) => t.assignee === me
  const colorOfMember = (u) => (sharedProject && u ? sh.color(sharedProject.id, u) : null)
  const visible = (t) => who === 'all' || (who === 'mine' ? mineOf(t) : !mineOf(t))

  const tasks = shown.flatMap((p) => p.tasks.map((t) => ({ ...t, projectId: p.id, projectName: p.name }))).filter((t) => !sharedProject || visible(t))
  const add = (e) => {
    e.preventDefault()
    if (!title.trim() || !projectFor) return
    const t = { id: crypto.randomUUID(), title: title.trim(), priority: 'media', due: due || null, status: 'todo' }
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === projectFor.id ? { ...p, tasks: [...p.tasks, t] } : p)) }))
    setTitle('')
    setDue('')
  }
  const toggleProject = (id) => update((d) => {
    const cur = selectedOf(d)
    const next = cur.length === projectsOf(d).length ? [id] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    return { ...d, selectedProjects: next.length === projectsOf(d).length || !next.length ? [] : next }
  })

  // ---- Arrastrar (ratón: al moverse; táctil: tras mantener pulsado) ----
  const columnAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-state]')?.dataset.state ?? null
  const onPointerDown = (e, t) => {
    if (e.button !== 0 || e.target.closest('button')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, task: t, w: rect.width, dx: e.clientX - rect.left, dy: e.clientY - rect.top, touch: e.pointerType !== 'mouse', active: false }
    if (start.touch) start.timer = setTimeout(() => { start.active = true; navigator.vibrate?.(15); setDrag({ ...start, x: start.x, y: start.y, over: t.status }) }, LONG_PRESS)
    press.current = start
  }
  useEffect(() => {
    const move = (e) => {
      const s = press.current
      if (!s) return
      const far = Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6
      if (!s.active) {
        if (s.touch) { if (far) { clearTimeout(s.timer); press.current = null } return } // se está desplazando
        if (!far) return
        s.active = true
      }
      const row = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-assign]')
      setOverRef.current(row ? row.dataset.assign || '_' : null)
      setDrag({ ...s, x: e.clientX, y: e.clientY, over: columnAt(e.clientX, e.clientY) })
    }
    const block = (e) => { if (press.current?.active) e.preventDefault() } // en táctil, que no se mueva la página mientras arrastras
    const up = (e) => {
      const s = press.current
      press.current = null
      if (!s) return
      clearTimeout(s.timer)
      if (!s.active) { setEditing({ projectId: s.task.projectId, taskId: s.task.id }); return } // fue un toque: abrir la ficha
      const row = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-assign]')
      setOverRef.current(null)
      if (row && assignRef.current) { setDrag(null); assignRef.current(s.task.id, row.dataset.assign || null); return } // soltada sobre una persona (o «sin asignar»)
      const to = columnAt(e.clientX, e.clientY)
      setDrag(null)
      if (to && to !== s.task.status) update((d) => updateTask(d, s.task.projectId, s.task.id, { status: to, doneAt: to === 'done' ? today : null }))
    }
    const cancel = () => { if (press.current) clearTimeout(press.current.timer); press.current = null; setDrag(null) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('touchmove', block, { passive: false })
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); window.removeEventListener('touchmove', block) }
  }, [today, update])

  if (!projects.length) return <Empty icon="board" text="Tus tareas aparecerán aquí cuando crees un proyecto" />

  const milestoneOf = (t) => projects.find((p) => p.id === (t.projectId ?? onlyProject))?.milestones?.find((m) => m.id === t.milestoneId)
  const card = (t) => {
    const c = colorOf(data, t.projectId)
    const ms = t.milestoneId ? milestoneOf(t) : null
    const subs = t.subtasks ?? []
    const late = t.status !== 'done' && t.due && t.due < today
    return (
      <>
        {mixed && <span className="wk-tag"><span className="dot" style={{ background: c }} />{t.projectName}</span>}
        <span className="wk-task-title">{t.title}{t.assignee && members.find((m) => m.username === t.assignee) && <span className="wk-assignee" style={{ '--m': colorOfMember(t.assignee) }} title={`@${t.assignee}`}><Avatar avatar={members.find((m) => m.username === t.assignee).avatar} size={18} /></span>}</span>
        {(ms || late || subs.length > 0) && (
          <span className="wk-task-meta">
            {ms && <span className="wk-ms-tag" style={{ '--c': c }} title={`Del hito «${ms.title}»`}><i />{ms.title}</span>}
            {late && <span className="wk-due is-late" title="Vencida">Vencida</span>}
            {subs.length > 0 && <span className="wk-subs">{subs.filter((x) => x.done).length}/{subs.length}</span>}
          </span>
        )}
      </>
    )
  }

  return (
    <div className="wk-board">
      {!onlyProject && projects.length > 1 && (
        <div className="wk-filter" aria-label="Proyectos en el tablero">
          {projects.map((p) => {
            const on = selected.includes(p.id) && selected.length < projects.length
            return (
              <button key={p.id} className={`seg-chip ${on ? 'on' : ''}`} style={{ background: soft(colorOf(data, p.id), on ? 55 : 22) }} aria-pressed={on} onClick={() => toggleProject(p.id)}>
                <span className="dot" style={{ background: colorOf(data, p.id), width: 8, height: 8 }} />{p.name}
              </button>
            )
          })}
        </div>
      )}
      {sharedProject && (
        <div className="wk-assign" aria-label="Repartir tareas">
          <div className="wk-assign-top">
            <span className="muted">Arrastra una tarea a una persona, o tócala para asumirla tú</span>
            <span className="ag-who" role="group" aria-label="Qué tareas ver">
              {[['all', 'Todo'], ['mine', 'Mías'], ['others', 'Del resto']].map(([k, l]) => <button key={k} type="button" className={who === k ? 'on' : ''} aria-pressed={who === k} onClick={() => setWho(k)}>{l}</button>)}
            </span>
          </div>
          {[{ username: null, label: 'Sin asignar' }, ...members].map((m) => {
            const mine = sharedProject.tasks.filter((t) => t.status !== 'done' && (t.assignee ?? null) === m.username && (m.username === null ? who !== 'mine' : true))
            return (
              <div key={m.username ?? 'none'} data-assign={m.username ?? ''} className={`wk-assign-row ${over === (m.username ?? '_') ? 'is-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOver(m.username ?? '_') }} onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/task'); if (id) assign(id, m.username) }}>
                <span className="wk-assign-who" style={m.username ? { '--m': colorOfMember(m.username) } : undefined}>{m.username ? <span className="wk-ring"><Avatar avatar={m.avatar} size={26} /></span> : <Icon name="board" size={18} />}<b>{m.username ? (m.you ? 'Yo' : `@${m.username}`) : m.label}</b><i>{mine.length}</i></span>
                <span className="wk-assign-bubbles">
                  {mine.map((t) => (
                    <span key={t.id} className="wk-bubble-wrap">
                      <button type="button" draggable className="wk-bubble" style={{ '--c': colorOfMember(m.username) ?? '#9AA0A6' }}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/task', t.id) }}
                      onClick={() => assign(t.id, m.username === me ? null : me)} title={`${t.milestoneId ? `Del hito «${milestoneOf({ ...t, projectId: sharedProject.id })?.title ?? ''}» · ` : ''}${m.username === me ? 'Toca para soltarla' : 'Toca para asumirla tú'}`}>{t.milestoneId && <i className="wk-ms-dia" />}{t.title}</button>
                      <span className="wk-bubble-tools">
                        <button type="button" onClick={() => setEditing({ projectId: sharedProject.id, taskId: t.id })} aria-label={`Editar ${t.title}`} title="Editar"><Icon name="pen" size={11} strokeWidth={3} /></button>
                        <button type="button" onClick={() => window.confirm(`¿Borrar «${t.title}»?`) && update((d) => ({ ...d, projects: d.projects.map((p) => (p.id !== sharedProject.id ? p : { ...p, tasks: p.tasks.filter((x) => x.id !== t.id) })) }))} aria-label={`Borrar ${t.title}`} title="Borrar"><Icon name="close" size={11} strokeWidth={3} /></button>
                      </span>
                    </span>
                  ))}
                  {mine.length === 0 && <span className="muted wk-assign-empty">{m.username ? 'Suelta aquí una tarea' : 'Todo repartido'}</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <form className="wk-taskform" onSubmit={add}>
        {mixed && (
          <Select value={projectFor?.id} label="Proyecto" onChange={setTarget} options={shown.map((p) => ({ value: p.id, label: p.name, color: colorOf(data, p.id) }))} />
        )}
        <input placeholder="Nueva tarea" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Nueva tarea" />
        <label className={`wk-date-field ${due ? 'on' : ''}`} title="Fecha límite">
          <Icon name="calendario" size={16} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fecha de la tarea" />
        </label>
        <button className="icon-btn on" disabled={!title.trim()} aria-label="Añadir tarea"><Icon name="plus" size={20} /></button>
      </form>

      <div className="wk-cols">
        {STATES.map((s) => {
          const list = tasks.filter((t) => t.status === s.id).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'))
          return (
            <section key={s.id} data-state={s.id} className={`wk-col wk-col-${s.id} ${drag && drag.over === s.id ? 'is-over' : ''}`} aria-label={s.label}>
              <span className="wk-col-head">{s.id === 'done' ? 'Hechas' : s.label}<b>{list.length}</b></span>
              {list.map((t) => (
                <div key={t.id} className={`wk-task ${drag?.task.id === t.id ? 'is-dragging' : ''}`} style={{ '--c': colorOf(data, t.projectId), ...(colorOfMember(t.assignee) ? { '--bub': soft(colorOfMember(t.assignee), 38) } : {}) }} role="button" tabIndex={0}
                  onPointerDown={(e) => onPointerDown(e, t)} onKeyDown={(e) => e.key === 'Enter' && setEditing({ projectId: t.projectId, taskId: t.id })}
                  onContextMenu={(e) => e.preventDefault()} title="Arrastra para cambiar de columna · toca para editar">
                  {card(t)}
                </div>
              ))}
            </section>
          )
        })}
      </div>

      {drag && createPortal(
        <div className="wk-task wk-ghost" style={{ '--c': colorOf(data, drag.task.projectId), width: drag.w, left: drag.x - drag.dx, top: drag.y - drag.dy }}>{card(drag.task)}</div>,
        document.body,
      )}
      {editing && <TaskEditor data={data} update={update} projectId={editing.projectId} taskId={editing.taskId} onClose={() => setEditing(null)} />}
    </div>
  )
}
