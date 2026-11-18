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
        <History title="Tareas hechas" empty="Aún no has terminado ninguna tarea" onRestore={restore}
          items={done.map((t) => ({ id: t.id, date: t.doneAt ? formatShort(t.doneAt) : '', text: `${t.course ? t.course + ' · ' : ''}${t.title}` }))} />
      </div>

      <form className="tk-top" onSubmit={add}>
        <input value={draft.title} placeholder="Nueva tarea…" maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Nueva tarea" />
        <Select className="tk-link" label="Vincular a una asignatura" value={subjects.some((s) => s.short === draft.course) ? draft.course : ''} options={options} onChange={(v) => setDraft({ ...draft, course: v })} />
        <DatePicker value={draft.due} onChange={(v) => setDraft({ ...draft, due: v })} label="Fecha de la tarea" placeholder="Fecha" />
        <button className="icon-btn on" disabled={!draft.title.trim()} aria-label="Añadir tarea" title="Añadir"><Icon name="plus" size={18} strokeWidth={2.6} /></button>
      </form>

      <ul className="tk-flat">
        {list.map((t) => {
          const c = courseOf(t)
          const color = c ? colorOf(c) : '#80868B'
          return (
            <li key={t.id} className="tk-row" style={c ? { background: soft(color, 14) } : undefined}>
              <button className="tk-check" onClick={() => finish(t.id)} aria-label={`Marcar «${t.title}» como hecha`} style={c ? { borderColor: color } : undefined} />
              <span className="tk-title">{t.title}</span>
              {t.due && <small className={`tk-when ${t.due < today ? 'is-late' : ''}`}>{when(t.due)}</small>}
              <Select className="tk-tag" label={`Asignatura de «${t.title}»`} value={c} options={options} onChange={(v) => patch(t.id, { course: v || null })} placeholder="Sin vincular"
                style={{ '--c': c ? soft(color, 38) : '#E8EAED', color: c ? color : '#80868B', fontWeight: 700 }} />
              <button className="prio-x tk-del" onClick={() => remove(t.id)} aria-label={`Quitar «${t.title}»`}><Icon name="close" size={12} /></button>
            </li>
          )
        })}
        {list.length === 0 && <li className="tk-empty">Sin tareas pendientes</li>}
      </ul>
    </div>
  )
}
