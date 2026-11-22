import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import History from '../../components/History.jsx'
import DatePicker from '../../components/DatePicker.jsx'
import SubjectPicker from './SubjectPicker.jsx'
import { daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { soft } from './helpers.js'

/**
 * Tareas: una caja por asignatura (las de «sin vincular» van aparte), cada una con sus tareas por orden de fecha.
 * Una tarea puede ser de varias asignaturas a la vez (sale en cada una). Lo de hoy se ve destacado.
 * Al marcar una tarea se va al historial (reloj). El lápiz y la papelera siempre están en su sitio.
 * data.tasks = [{ id, courses: [siglas], course (la primera, por compatibilidad), title, due?, done, doneAt? }]
 */
export default function Tasks({ data, update, subjects }) {
  const today = todayISO()
  const all = data.tasks ?? []
  const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const pending = all.filter((t) => !t.done)
  const known = new Set(subjects.map((s) => s.short))
  const [draft, setDraft] = useState({ title: '', courses: [], due: '' })
  const [open, setOpen] = useState(false) // la barra de «Nueva tarea» solo sale al pulsar el +
  const [edit, setEdit] = useState(null) // { id, title, courses, due }: tarea que se está editando

  // Asignaturas de una tarea (las que ya no existen se ignoran); las antiguas guardaban solo `course`
  const coursesOf = (t) => (t.courses?.length ? t.courses : t.course ? [t.course] : []).filter((c) => known.has(c))
  const byDate = (list) => [...list].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const when = (d) => { const n = daysUntil(d, today); return n < 0 ? 'Vencida' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : formatShort(d) }
  const sub = (c) => subjects.find((s) => s.short === c)

  const add = (e) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    update((d) => ({ ...d, tasks: [...(d.tasks ?? []), { id: crypto.randomUUID(), courses: draft.courses, course: draft.courses[0] ?? null, title: draft.title.trim(), due: draft.due || null, done: false }] }))
    setDraft({ ...draft, title: '', due: '' })
    setOpen(false)
  }
  const patch = (id, p) => update((d) => ({ ...d, tasks: (d.tasks ?? []).map((t) => (t.id === id ? { ...t, ...p } : t)) }))
  const setCourses = (id, courses) => patch(id, { courses, course: courses[0] ?? null })
  const saveEdit = (e) => {
    e.preventDefault()
    if (!edit?.title.trim()) return
    patch(edit.id, { title: edit.title.trim(), due: edit.due || null, courses: edit.courses, course: edit.courses[0] ?? null })
    setEdit(null)
  }
  const finish = (id) => patch(id, { done: true, doneAt: today })
  const restore = (id) => patch(id, { done: false, doneAt: null })
  const remove = (id) => update((d) => ({ ...d, tasks: (d.tasks ?? []).filter((t) => t.id !== id) }))
  const startEdit = (t) => setEdit({ id: t.id, title: t.title, courses: coursesOf(t), due: t.due ?? '' })

  // Una caja por asignatura (la tarea de varias sale en cada una) + la de sin vincular
  const boxes = subjects.map((s) => ({ key: s.short, name: s.short, color: s.color, list: byDate(pending.filter((t) => coursesOf(t).includes(s.short))) })).filter((b) => b.list.length)
  const loose = byDate(pending.filter((t) => !coursesOf(t).length))
  if (loose.length) boxes.push({ key: '', name: 'Sin vincular', color: '#80868B', list: loose })
  // Las cajas con algo para hoy primero, y luego por la fecha de su tarea más cercana
  const first = (b) => b.list[0]?.due ?? '9999'
  boxes.sort((a, b) => first(a).localeCompare(first(b)))

  const row = (t, boxColor) => {
    const cs = coursesOf(t)
    const isToday = t.due === today
    const late = t.due && t.due < today
    if (edit?.id === t.id) {
      return (
        <li key={t.id} className="tk-row tk-editing">
          <form className="tk-edit" onSubmit={saveEdit} onKeyDown={(e) => e.key === 'Escape' && setEdit(null)}>
            <input autoFocus value={edit.title} maxLength={80} onChange={(e) => setEdit({ ...edit, title: e.target.value })} aria-label="Nombre de la tarea" />
            <SubjectPicker subjects={subjects} value={edit.courses} onChange={(v) => setEdit({ ...edit, courses: v })} label="Asignaturas de la tarea" />
            <DatePicker value={edit.due} onChange={(v) => setEdit({ ...edit, due: v })} label="Fecha de la tarea" placeholder="Fecha" />
            <button type="button" className="icon-btn" onClick={() => setEdit(null)} aria-label="Cancelar" title="Cancelar"><Icon name="close" size={18} /></button>
            <button className="icon-btn on" disabled={!edit.title.trim()} aria-label="Guardar" title="Guardar"><Icon name="check" size={18} /></button>
          </form>
        </li>
      )
    }
    return (
      <li key={t.id} className={`tk-row ${isToday ? 'is-today' : ''} ${late ? 'is-lateRow' : ''}`} style={{ '--bc': boxColor, ...(isToday ? { background: soft(boxColor, 34), boxShadow: `inset 4px 0 0 ${boxColor}` } : {}) }}>
        <button className="tk-check" onClick={() => finish(t.id)} aria-label={`Marcar «${t.title}» como hecha`} style={{ borderColor: boxColor }} />
        <button type="button" className="tk-title tk-title-btn" onClick={() => startEdit(t)} title="Editar la tarea">{t.title}</button>
        {t.due && <small className={`tk-when ${late ? 'is-late' : ''} ${isToday ? 'is-now' : ''}`}>{when(t.due)}</small>}
        <SubjectPicker compact subjects={subjects} value={cs} onChange={(v) => setCourses(t.id, v)} label={`Asignaturas de «${t.title}»`} />
        <button className="tk-ic" onClick={() => startEdit(t)} aria-label={`Editar «${t.title}»`} title="Editar"><Icon name="pen" size={15} /></button>
        <button className="tk-ic" onClick={() => remove(t.id)} aria-label={`Quitar «${t.title}»`} title="Quitar"><Icon name="trash" size={15} /></button>
      </li>
    )
  }

  return (
    <div className="tareas">
      <div className="deliv-head">
        <h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Tareas</h2>
        <span className="tk-head-btns">
          <button type="button" className={`icon-btn tk-plus ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Añadir una tarea" title="Añadir una tarea"><Icon name="plus" size={18} strokeWidth={2.6} /></button>
          <History title="Tareas hechas" empty="Aún no has terminado ninguna tarea" onRestore={restore}
            items={done.map((t) => ({ id: t.id, date: t.doneAt ? formatShort(t.doneAt) : '', text: `${coursesOf(t).length ? coursesOf(t).join(' + ') + ' · ' : ''}${t.title}` }))} />
        </span>
      </div>

      {open && (
        <form className="tk-top" onSubmit={add} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <input autoFocus value={draft.title} placeholder="Nueva tarea…" maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Nueva tarea" />
          <SubjectPicker subjects={subjects} value={draft.courses} onChange={(v) => setDraft({ ...draft, courses: v })} label="Vincular a asignaturas" />
          <DatePicker value={draft.due} onChange={(v) => setDraft({ ...draft, due: v })} label="Fecha de la tarea" placeholder="Fecha" />
          <button className="icon-btn on" disabled={!draft.title.trim()} aria-label="Añadir tarea" title="Añadir"><Icon name="check" size={18} /></button>
        </form>
      )}

      <div className="tk-cols">
        {boxes.map((b) => (
          <section key={b.key || 'loose'} className="tk-col" style={{ background: soft(b.color, 16) }} aria-label={b.name}>
            <span className="tk-name"><b style={{ color: b.color === '#80868B' ? '#5F6368' : b.color, filter: 'brightness(.78)' }}>{b.name}</b><span className="tk-count">{b.list.length}</span></span>
            <ul className="tk-list">{b.list.map((t) => row(t, b.color))}</ul>
          </section>
        ))}
        {boxes.length === 0 && <p className="tk-empty">Sin tareas pendientes</p>}
      </div>
    </div>
  )
}
