import Select from '../../components/Select.jsx'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

  const tasks = shown.flatMap((p) => p.tasks.map((t) => ({ ...t, projectId: p.id, projectName: p.name })))
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
      setDrag({ ...s, x: e.clientX, y: e.clientY, over: columnAt(e.clientX, e.clientY) })
    }
    const block = (e) => { if (press.current?.active) e.preventDefault() } // en táctil, que no se mueva la página mientras arrastras
    const up = (e) => {
      const s = press.current
      press.current = null
      if (!s) return
      clearTimeout(s.timer)
      if (!s.active) { setEditing({ projectId: s.task.projectId, taskId: s.task.id }); return } // fue un toque: abrir la ficha
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

  if (!projects.length) return <p className="muted wk-empty"><Icon name="trabajo" size={20} /> Crea un proyecto para empezar</p>

  const card = (t) => {
    const c = colorOf(data, t.projectId)
    const subs = t.subtasks ?? []
    const late = t.status !== 'done' && t.due && t.due < today
    return (
      <>
        {mixed && <span className="wk-tag"><span className="dot" style={{ background: c }} />{t.projectName}</span>}
        <span className="wk-task-title">{t.title}</span>
        <span className="wk-task-meta">
          <span className="wk-prio-word" style={{ background: soft(PRIORITY[t.priority], 35) }}>{PRIORITY_WORD[t.priority]}</span>
          {t.due && <span className={`wk-due ${late ? 'is-late' : ''}`}>{late ? 'Vencida · ' : ''}{formatShort(t.due).replace(/^\S+ /, '')}</span>}
          {subs.length > 0 && <span className="wk-subs">{subs.filter((s) => s.done).length}/{subs.length} subtareas</span>}
          {t.notes && <span className="wk-subs">Notas</span>}
        </span>
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
      <form className="wk-taskform" onSubmit={add}>
        {mixed && (
          <Select value={projectFor?.id} label="Proyecto" onChange={setTarget} options={shown.map((p) => ({ value: p.id, label: p.name, color: colorOf(data, p.id) }))} />
        )}
        <input placeholder="Nueva tarea" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Nueva tarea" />
        <label className={`icon-btn wk-date ${due ? 'on' : ''}`} title={due ? formatShort(due) : 'Fecha'}>
          <Icon name="calendario" size={18} />
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
                <div key={t.id} className={`wk-task ${drag?.task.id === t.id ? 'is-dragging' : ''}`} style={{ '--c': colorOf(data, t.projectId) }} role="button" tabIndex={0}
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
