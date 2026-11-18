import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import History from '../../components/History.jsx'
import DatePicker from '../../components/DatePicker.jsx'
import Select from '../../components/Select.jsx'
import { daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { soft } from './helpers.js'

/**
 * Tareas: una lista seguida, ordenada por fecha. Vincular a una asignatura es opcional: al añadir se elige con «Vincular a…»
 * y al final de cada tarea sale la asignatura con su color (se cambia pulsándola). Al marcar una tarea se va al historial (reloj).
 * data.tasks = [{ id, course | null, title, due?, done, doneAt? }]
 */
export default function Tasks({ data, update, subjects }) {
  const today = todayISO()
  const all = data.tasks ?? []
  const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const pending = all.filter((t) => !t.done)
  const known = new Set(subjects.map((s) => s.short))
  const [draft, setDraft] = useState({ title: '', course: '', due: '' }) // course '' = sin vincular
  const [open, setOpen] = useState(false) // la barra de «Nueva tarea» solo sale al pulsar el +
  const [edit, setEdit] = useState(null) // { id, title, course, due }: tarea que se está editando

  const courseOf = (t) => (t.course && known.has(t.course) ? t.course : '') // una asignatura que ya no existe cuenta como sin vincular
  const sorted = (list) => [...list].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const when = (d) => { const n = daysUntil(d, today); return n < 0 ? 'Vencida' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : formatShort(d) }
  const colorOf = (c) => subjects.find((s) => s.short === c)?.color ?? '#9AA0A6'
  const options = [{ value: '', label: 'Sin vincular', color: '#E8EAED' }, ...subjects.map((s) => ({ value: s.short, label: s.short, color: s.color }))]

  const add = (e) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    update((d) => ({ ...d, tasks: [...(d.tasks ?? []), { id: crypto.randomUUID(), course: draft.course || null, title: draft.title.trim(), due: draft.due || null, done: false }] }))
    setDraft({ ...draft, title: '', due: '' })
    setOpen(false)
  }
  const saveEdit = (e) => {
    e.preventDefault()
    if (!edit?.title.trim()) return
    patch(edit.id, { title: edit.title.trim(), due: edit.due || null, course: edit.course || null })
    setEdit(null)
  }
  const patch = (id, p) => update((d) => ({ ...d, tasks: (d.tasks ?? []).map((t) => (t.id === id ? { ...t, ...p } : t)) }))
  const finish = (id) => patch(id, { done: true, doneAt: today })
  const restore = (id) => patch(id, { done: false, doneAt: null })
  const remove = (id) => update((d) => ({ ...d, tasks: (d.tasks ?? []).filter((t) => t.id !== id) }))

  const list = sorted(pending)

  return (
    <div className="tareas">
      <div className="deliv-head">
        <h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Tareas</h2>
 <span className="tk-head-btns">
          <button type="button" className={`icon-btn tk-plus ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Añadir una tarea" title="Añadir una tarea"><Icon name="plus" size={18} strokeWidth={2.6} /></button>
        <History title="Tareas hechas" empty="Aún no has terminado ninguna tarea" onRestore={restore}
          items={done.map((t) => ({ id: t.id, date: t.doneAt ? formatShort(t.doneAt) : '', text: `${t.course ? t.course + ' · ' : ''}${t.title}` }))} />
        </span>
      </div>

      {open && (
      <form className="tk-top" onSubmit={add} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
        <input autoFocus value={draft.title} placeholder="Nueva tarea…" maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Nueva tarea" />
        <Select className="tk-link" label="Vincular a una asignatura" value={subjects.some((s) => s.short === draft.course) ? draft.course : ''} options={options} onChange={(v) => setDraft({ ...draft, course: v })} />
        <DatePicker value={draft.due} onChange={(v) => setDraft({ ...draft, due: v })} label="Fecha de la tarea" placeholder="Fecha" />
        <button className="icon-btn on" disabled={!draft.title.trim()} aria-label="Añadir tarea" title="Añadir"><Icon name="check" size={18} /></button>
      </form>
      )}

      <ul className="tk-flat">
        {list.map((t) => {
          const c = courseOf(t)
          const color = c ? colorOf(c) : '#80868B'
          return (
            edit?.id === t.id ? (
              <li key={t.id} className="tk-row tk-editing">
                <form className="tk-edit" onSubmit={saveEdit} onKeyDown={(e) => e.key === 'Escape' && setEdit(null)}>
                  <input autoFocus value={edit.title} maxLength={80} onChange={(e) => setEdit({ ...edit, title: e.target.value })} aria-label="Nombre de la tarea" />
                  <Select className="tk-link" label="Asignatura" value={subjects.some((x) => x.short === edit.course) ? edit.course : ''} options={options} onChange={(v) => setEdit({ ...edit, course: v })} />
                  <DatePicker value={edit.due} onChange={(v) => setEdit({ ...edit, due: v })} label="Fecha de la tarea" placeholder="Fecha" />
                  <button type="button" className="icon-btn" onClick={() => setEdit(null)} aria-label="Cancelar" title="Cancelar"><Icon name="close" size={18} /></button>
                  <button className="icon-btn on" disabled={!edit.title.trim()} aria-label="Guardar" title="Guardar"><Icon name="check" size={18} /></button>
                </form>
              </li>
            ) : (
            <li key={t.id} className="tk-row" style={c ? { background: soft(color, 14) } : undefined}>
              <button className="tk-check" onClick={() => finish(t.id)} aria-label={`Marcar «${t.title}» como hecha`} style={c ? { borderColor: color } : undefined} />
              <button type="button" className="tk-title tk-title-btn" onClick={() => setEdit({ id: t.id, title: t.title, course: t.course ?? '', due: t.due ?? '' })} title="Editar la tarea">{t.title}</button>
              {t.due && <small className={`tk-when ${t.due < today ? 'is-late' : ''}`}>{when(t.due)}</small>}
              <Select className="tk-tag" label={`Asignatura de «${t.title}»`} value={c} options={options} onChange={(v) => patch(t.id, { course: v || null })} placeholder="Sin vincular"
                style={{ '--c': c ? soft(color, 38) : '#E8EAED', color: c ? color : '#80868B', fontWeight: 700 }} />
              <button className="prio-x tk-pen" onClick={() => setEdit({ id: t.id, title: t.title, course: t.course ?? '', due: t.due ?? '' })} aria-label={`Editar «${t.title}»`} title="Editar"><Icon name="pen" size={13} /></button>
              <button className="prio-x tk-del" onClick={() => remove(t.id)} aria-label={`Quitar «${t.title}»`}><Icon name="close" size={12} /></button>
            </li>
            )
          )
        })}
        {list.length === 0 && <li className="tk-empty">Sin tareas pendientes</li>}
      </ul>
    </div>
  )
}
