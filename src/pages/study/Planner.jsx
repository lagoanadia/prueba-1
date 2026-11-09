import { useState } from 'react'
import { formatToday, todayISO } from '../../lib/dates.js'
import { progressOf, subjectsOf } from '../../widgets/estudios/study.js'
import { cellColor, soft, unitProgress } from './helpers.js'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const COLORS = ['#3185FC', '#E84855', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF']
const slotTime = (s) => (typeof s === 'string' ? s : s.time)

/** Planificador de estudios: asignaturas, tareas, herramientas, curriculum y horario. */
export default function Planner({ data, update, openSubject }) {
  const today = todayISO()
  const subjects = subjectsOf(data)
  const dayIdx = (new Date(`${today}T12:00:00`).getDay() + 6) % 7
  const tt = data.timetable ?? { slots: [], cells: {} }
  const [newSubject, setNewSubject] = useState({ short: '', name: '' })
  const [task, setTask] = useState({ course: '', title: '', due: '' })
  const [tool, setTool] = useState('')
  const [cv, setCv] = useState('')
  const [editing, setEditing] = useState(null)

  const assignments = [...(data.assignments ?? [])].filter((a) => !a.done || a.doneAt === today).sort((a, b) => a.due.localeCompare(b.due))
  const courseName = (c) => subjects.find((s) => s.short === c)?.name ?? c
  const courseColor = (c) => subjects.find((s) => s.short === c)?.color ?? '#9AA0A6'

  const addSubject = (e) => {
    e.preventDefault()
    if (!newSubject.short.trim()) return
    update((d) => { const list = d.subjects ?? []; return { ...d, subjects: [...list, { id: crypto.randomUUID(), short: newSubject.short.trim().toUpperCase(), name: newSubject.name.trim() || newSubject.short.trim(), color: COLORS[list.length % COLORS.length], units: [{ id: crypto.randomUUID(), name: 'UD1', topics: [] }] }] } })
    setNewSubject({ short: '', name: '' })
  }
  const addTask = (e) => {
    e.preventDefault()
    if (!task.title.trim() || !task.due) return
    update((d) => ({ ...d, assignments: [...(d.assignments ?? []), { id: crypto.randomUUID(), course: task.course || subjects[0]?.short || '', title: task.title.trim(), due: task.due, done: false }] }))
    setTask({ ...task, title: '', due: '' })
  }
  const toggleTask = (id) => update((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id !== id ? a : { ...a, done: !a.done, doneAt: a.done ? null : today })) }))
  const addTo = (key, value, reset) => (e) => {
    e.preventDefault()
    if (!value.trim()) return
    const [name, url] = value.split(/\s+(https?:\/\/\S+)$/)
    update((d) => ({ ...d, [key]: [...(d[key] ?? []), { id: crypto.randomUUID(), name: name.trim(), url: url ?? '' }] }))
    reset('')
  }
  const removeFrom = (key, id) => update((d) => ({ ...d, [key]: d[key].filter((x) => x.id !== id) }))
  const setCell = (k, v) => update((d) => { const t = d.timetable ?? { slots: [], cells: {} }; return { ...d, timetable: { ...t, cells: { ...t.cells, [k]: v } } } })
  const addSlot = (isBreak) => update((d) => {
    const t = d.timetable ?? { slots: [], cells: {} }
    const last = t.slots.length ? slotTime(t.slots[t.slots.length - 1]).split('-')[1] : '8:00'
    const [h, m] = last.split(':').map(Number)
    const end = h * 60 + m + (isBreak ? 20 : 55)
    const time = `${last}-${Math.floor(end / 60)}:${String(end % 60).padStart(2, '0')}`
    return { ...d, timetable: { ...t, slots: [...t.slots, isBreak ? { time, label: 'Recreo' } : time] } }
  })
  const removeSlot = (i) => update((d) => { const t = d.timetable; return { ...d, timetable: { ...t, slots: t.slots.filter((_, j) => j !== i) } } })

  return (
    <div className="page study">
      <header className="page-head">
        <div>
          <h1>Planificador de estudios</h1>
          <p className="muted page-sub">{formatToday()}</p>
        </div>
      </header>

      <h2 className="page-h2">Progreso de las asignaturas</h2>
      <div className="subject-cards">
        {subjects.map((s, i) => {
          const { total, clear, pct } = progressOf(s)
          return (
            <button key={s.id} className="card subject-card" style={{ '--i': i, '--c': s.color }} onClick={() => openSubject(s.id)}>
              <span className="subject-card-head" style={{ background: soft(s.color, 30) }}>{s.short}</span>
              <span className="subject-card-body">
                <b>{s.name}</b>
                {total ? <span className="w-row"><span className="muted">{clear} de {total} temas</span><b>{pct} %</b></span> : <span className="muted">Sin temas todavía</span>}
                <span className="bar"><span style={{ width: `${pct}%`, background: s.color }} /></span>
                <span className="unit-chips">{s.units.filter((u) => u.topics.length).map((u) => <span key={u.id}>{u.name.split(' ')[0]} · {unitProgress(u).total}</span>)}</span>
              </span>
            </button>
          )
        })}
        <form className="card subject-card subject-add" onSubmit={addSubject}>
          <input placeholder="Siglas" value={newSubject.short} onChange={(e) => setNewSubject({ ...newSubject, short: e.target.value })} maxLength={6} />
          <input placeholder="Nombre de la asignatura" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} maxLength={60} />
          <button className="pill pill-soft" disabled={!newSubject.short.trim()}>+ Asignatura</button>
        </form>
      </div>

      <div className="study-mid">
        <section>
          <h2 className="page-h2">Tareas</h2>
          <div className="card study-table">
            <table>
              <thead><tr><th>Curso</th><th>Tarea</th><th>Plazo</th><th>Hecha</th></tr></thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className={a.done ? 'is-done' : ''}>
                    <td><span className="dot" style={{ background: courseColor(a.course) }} /> {courseName(a.course)}</td>
                    <td><b>{a.title}</b></td>
                    <td>{a.due.split('-').reverse().join('/')}{!a.done && a.due < today && <span className="badge-late">Vencida</span>}</td>
                    <td><input type="checkbox" checked={a.done} onChange={() => toggleTask(a.id)} aria-label={`Marcar «${a.title}»`} /></td>
                  </tr>
                ))}
                {assignments.length === 0 && <tr><td colSpan={4} className="muted">Sin tareas pendientes</td></tr>}
              </tbody>
            </table>
            <form className="w-form study-add" onSubmit={addTask}>
              <select value={task.course} onChange={(e) => setTask({ ...task, course: e.target.value })} style={{ flex: 'none' }}>
                {subjects.map((s) => <option key={s.id} value={s.short}>{s.short}</option>)}
              </select>
              <input placeholder="Nueva tarea" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} maxLength={60} />
              <input type="date" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} style={{ flex: 'none' }} aria-label="Plazo" />
              <button className="mini mini-primary" disabled={!task.title.trim() || !task.due} aria-label="Añadir tarea">+</button>
            </form>
          </div>
        </section>
        <aside className="study-side">
          {[['tools', 'Herramientas de interés', tool, setTool, 'Vercel https://vercel.com'], ['cv', 'Añadir al curriculum', cv, setCv, 'Docker']].map(([key, title, value, setValue, ph]) => (
            <section key={key}>
              <h2 className="page-h2">{title}</h2>
              <div className="card study-list">
                <ul>
                  {(data[key] ?? []).map((x) => (
                    <li key={x.id}>
                      <span className="dot" style={{ background: key === 'tools' ? '#8E7CFF' : '#3185FC' }} />
                      {/^https?:\/\//.test(x.url) ? <a href={x.url} target="_blank" rel="noreferrer noopener">{x.name}</a> : <span>{x.name}</span>}
                      <button className="prio-x" onClick={() => removeFrom(key, x.id)} aria-label="Quitar">×</button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={addTo(key, value, setValue)}><input className="line-input" placeholder={`+ ${ph}`} value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} /></form>
              </div>
            </section>
          ))}
        </aside>
      </div>

      <h2 className="page-h2">Horario</h2>
      <div className="timetable" style={{ '--rows': tt.slots.length }}>
        <span />
        {DAYS.map((d, i) => <span key={d} className={`tt-day ${i === dayIdx ? 'is-today' : ''}`}>{d}{i === dayIdx ? ' · hoy' : ''}</span>)}
        {tt.slots.map((slot, r) => (typeof slot === 'object' ? (
          <div key={r} className="tt-line">
            <span className="tt-time">{slot.time}<button className="prio-x" onClick={() => removeSlot(r)} aria-label="Quitar franja">×</button></span>
            <span className="tt-break">{slot.label}</span>
          </div>
        ) : (
          <div key={r} className="tt-line">
            <span className="tt-time">{slot}<button className="prio-x" onClick={() => removeSlot(r)} aria-label="Quitar franja">×</button></span>
            {DAYS.map((_, c) => {
              const k = `${c}-${r}`
              const text = tt.cells[k] ?? ''
              return editing === k ? (
                <input key={k} className="tt-box tt-edit" autoFocus defaultValue={text} maxLength={24}
                  onBlur={(e) => { setCell(k, e.target.value.trim().toUpperCase()); setEditing(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(null) }} />
              ) : (
                <button key={k} className="tt-box" style={{ background: cellColor(text, subjects) ?? undefined }} onClick={() => setEditing(k)} title="Toca para editar">{text}</button>
              )
            })}
          </div>
        )))}
      </div>
      <div className="w-form tt-actions">
        <button className="pill pill-sm" onClick={() => addSlot(false)}>+ Franja</button>
        <button className="pill pill-sm" onClick={() => addSlot(true)}>+ Recreo</button>
      </div>
    </div>
  )
}
