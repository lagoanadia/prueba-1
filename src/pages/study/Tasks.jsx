import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import History from '../../components/History.jsx'
import DatePicker from '../../components/DatePicker.jsx'
import { daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { soft } from './helpers.js'

/**
 * Tareas por asignatura: una columna por asignatura, con su color. Cada «+ Tarea» ya sabe de qué asignatura es.
 * Al marcar una tarea se va al historial (reloj). data.tasks = [{ id, course, title, due?, done, doneAt? }]
 */
export default function Tasks({ data, update, subjects }) {
  const today = todayISO()
  const all = data.tasks ?? []
  const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const pending = all.filter((t) => !t.done)
  const [adding, setAdding] = useState(null) // { course, title, due }: el «+ Tarea» de una columna
  const [draft, setDraft] = useState({ title: '', course: null, due: '' }) // la barra de arriba: escribes, tocas la asignatura y añades
  const [filter, setFilter] = useState('todas')
  const known = new Set(subjects.map((s) => s.short))
  const orphans = pending.filter((t) => !known.has(t.course))

  const sorted = (list) => [...list].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const when = (d) => { if (!d) return ''; const n = daysUntil(d, today); return n < 0 ? 'Vencida' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : formatShort(d) }
  const finish = (id) => update((d) => ({ ...d, tasks: (d.tasks ?? []).map((t) => (t.id === id ? { ...t, done: true, doneAt: today } : t)) }))
  const restore = (id) => update((d) => ({ ...d, tasks: (d.tasks ?? []).map((t) => (t.id === id ? { ...t, done: false, doneAt: null } : t)) }))
  const remove = (id) => update((d) => ({ ...d, tasks: (d.tasks ?? []).filter((t) => t.id !== id) }))
  const draftCourse = draft.course && subjects.some((s) => s.short === draft.course) ? draft.course : subjects[0]?.short
  const addTop = (e) => {
    e.preventDefault()
    if (!draft.title.trim() || !draftCourse) return
    update((d) => ({ ...d, tasks: [...(d.tasks ?? []), { id: crypto.randomUUID(), course: draftCourse, title: draft.title.trim(), due: draft.due || null, done: false }] }))
    setDraft({ ...draft, title: '', due: '' })
  }
  const save = (e) => {
    e.preventDefault()
    if (!adding?.title.trim()) return
    update((d) => ({ ...d, tasks: [...(d.tasks ?? []), { id: crypto.randomUUID(), course: adding.course, title: adding.title.trim(), due: adding.due || null, done: false }] }))
    setAdding(null)
  }

  const column = (key, label, color, list, canAdd) => (
    <div key={key} className="tk-col" style={{ background: soft(color, 20) }}>
      <b className="tk-name" style={{ color }}><i style={{ background: color }} />{label}</b>
      <ul className="tk-list">
        {sorted(list).map((t) => (
          <li key={t.id} className="tk-row">
            <button className="tk-check" onClick={() => finish(t.id)} aria-label={`Marcar «${t.title}» como hecha`} style={{ borderColor: color }} />
            <span className="tk-title">{t.title}</span>
            {t.due && <small className={`tk-when ${t.due < today ? 'is-late' : ''}`}>{when(t.due)}</small>}
            <button className="prio-x tk-del" onClick={() => remove(t.id)} aria-label={`Quitar «${t.title}»`}><Icon name="close" size={12} /></button>
          </li>
        ))}
      </ul>
      {canAdd && (adding?.course === key
        ? (
          <form className="tk-form" onSubmit={save}>
            <input autoFocus value={adding.title} placeholder="Nueva tarea…" maxLength={80} onChange={(e) => setAdding({ ...adding, title: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setAdding(null)} aria-label={`Nueva tarea de ${label}`} />
            <span className="tk-form-row">
              <DatePicker value={adding.due} onChange={(v) => setAdding({ ...adding, due: v })} label="Fecha de la tarea" placeholder="Fecha" color={color} />
              <button className="icon-btn on" disabled={!adding.title.trim()} aria-label="Añadir" title="Añadir"><Icon name="check" size={18} /></button>
            </span>
          </form>
        )
        : <button className="tk-add" style={{ color }} onClick={() => setAdding({ course: key, title: '', due: '' })}>+ Tarea</button>)}
    </div>
  )

  return (
    <div className="tareas">
      <div className="deliv-head">
        <h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Tareas</h2>
        <History title="Tareas hechas" empty="Aún no has terminado ninguna tarea" onRestore={restore}
          items={done.map((t) => ({ id: t.id, date: t.doneAt ? formatShort(t.doneAt) : '', text: `${t.course} · ${t.title}` }))} />
      </div>
      {subjects.length === 0 && <p className="muted">Añade una asignatura arriba y aquí tendrás una columna para sus tareas.</p>}
      {subjects.length > 0 && (
        <form className="tk-top" onSubmit={addTop}>
          <input value={draft.title} placeholder="Nueva tarea…" maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Nueva tarea" />
          <span className="tk-chips" role="radiogroup" aria-label="Asignatura de la tarea">
            {subjects.map((s) => (
              <button type="button" key={s.id} role="radio" aria-checked={draftCourse === s.short} className={`tk-chip ${draftCourse === s.short ? 'on' : ''}`}
                style={{ background: soft(s.color, 22), color: s.color, borderColor: draftCourse === s.short ? s.color : 'transparent' }} onClick={() => setDraft({ ...draft, course: s.short })}>
                <i style={{ background: s.color }} />{s.short}
              </button>
            ))}
          </span>
          <DatePicker value={draft.due} onChange={(v) => setDraft({ ...draft, due: v })} label="Fecha de la tarea" placeholder="Fecha" />
          <button className="icon-btn on" disabled={!draft.title.trim()} aria-label="Añadir tarea" title="Añadir"><Icon name="plus" size={18} strokeWidth={2.6} /></button>
        </form>
      )}
      {subjects.length > 1 && (
        <div className="tk-filter" role="group" aria-label="Filtrar por asignatura">
          {[['todas', 'Todas'], ...subjects.map((s) => [s.short, s.short])].map(([id, l]) => <button type="button" key={id} className={`dt-chip ${filter === id ? 'on' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{l}</button>)}
        </div>
      )}
      <div className="tk-cols">
        {subjects.filter((s) => filter === 'todas' || filter === s.short).map((s) => column(s.short, s.short, s.color, pending.filter((t) => t.course === s.short), true))}
        {filter === 'todas' && orphans.length > 0 && column('__sin', 'Sin asignatura', '#9AA0A6', orphans, false)}
      </div>
    </div>
  )
}
