import { useState } from 'react'
import History from '../../components/History.jsx'
import { daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { subjectsOf } from './study.js'

/**
 * Entregas: tareas con plazo. Las vencidas se marcan. Al hacerlas, se van al historial (reloj).
 * S: la próxima · M: 3 próximas · T: lista · L: lista + nueva entrega.
 */
export default function Assignments({ size, data, update }) {
  const today = todayISO()
  const subjects = subjectsOf(data)
  const all = data.assignments ?? []
  const pending = all.filter((a) => !a.done).sort((a, b) => a.due.localeCompare(b.due))
  const done = all.filter((a) => a.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState(subjects[0]?.short ?? '')
  const [due, setDue] = useState('')

  const complete = (id) => update((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, done: true, doneAt: today } : a)) }))
  const add = (e) => {
    e.preventDefault()
    if (!title.trim() || !due) return
    update((d) => ({ ...d, assignments: [...(d.assignments ?? []), { id: crypto.randomUUID(), title: title.trim(), course, due, done: false }] }))
    setTitle('')
    setDue('')
  }
  const color = (c) => subjects.find((s) => s.short === c)?.color ?? '#DADCE0'
  const when = (d) => { const n = daysUntil(d, today); return n < 0 ? 'Vencida' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `${n} d` }
  const history = <History title="Entregas hechas" empty="Aún no has entregado nada" items={done.map((a) => ({ id: a.id, date: a.doneAt ? formatShort(a.doneAt) : '', text: `${a.course} · ${a.title}` }))} />

  if (size === 'S') {
    const next = pending[0]
    return (
      <div className="w-center">
        {history}
        {next ? <><b className={`big ${next.due < today ? 'is-late' : ''}`}>{when(next.due)}</b><span className="w-hint w-ellipsis">{next.course} · {next.title}</span></> : <span className="w-hint">Todo entregado</span>}
      </div>
    )
  }

  return (
    <>
      {history}
      <ul className="assignments">
        {(size === 'M' ? pending.slice(0, 3) : pending).map((a) => (
          <li key={a.id}>
            <button className="assign-check" onClick={() => complete(a.id)} aria-label={`Marcar «${a.title}» como entregada`} />
            <span className="subject-tag subject-tag-sm" style={{ background: color(a.course) }}>{a.course}</span>
            <span className="w-ellipsis assign-title">{a.title}</span>
            <span className={`assign-when ${a.due < today ? 'is-late' : ''}`}>{when(a.due)}</span>
          </li>
        ))}
        {pending.length === 0 && <li className="w-hint">Todo entregado</li>}
      </ul>
      {size === 'L' && (
        <form className="w-form" onSubmit={add}>
          <select value={course} onChange={(e) => setCourse(e.target.value)} style={{ flex: 'none' }}>
            {subjects.map((s) => <option key={s.id}>{s.short}</option>)}
          </select>
          <input placeholder="Nueva entrega" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ flex: 'none' }} aria-label="Plazo" />
          <button className="mini mini-primary" disabled={!title.trim() || !due} aria-label="Añadir">+</button>
        </form>
      )}
    </>
  )
}
