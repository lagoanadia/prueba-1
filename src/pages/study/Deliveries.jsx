import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import History from '../../components/History.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'
import { KINDS, soft } from './helpers.js'

/**
 * Próximas entregas: se pueden añadir, editar y quitar a mano; cada una lleva el icono de su tipo.
 * Si `course` viene, solo muestra las de esa asignatura; si no, todas agrupadas por asignatura.
 */
export default function Deliveries({ data, update, subjects, course = null }) {
  const today = todayISO()
  const all = (data.assignments ?? []).filter((a) => (course ? a.course === course : true))
  const pending = all.filter((a) => !a.done).sort((a, b) => a.due.localeCompare(b.due))
  const done = all.filter((a) => a.done)
  const [form, setForm] = useState(null) // null cerrado · { id?, title, course, due, kind }
  const color = (c) => subjects.find((s) => s.short === c)?.color ?? '#9AA0A6'

  const open = (a) => setForm(a ? { ...a } : { title: '', course: course ?? subjects[0]?.short ?? '', due: '', kind: 'practica' })
  const save = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.due || !form.course) return
    const item = { ...form, title: form.title.trim() }
    update((d) => ({ ...d, assignments: form.id ? d.assignments.map((a) => (a.id === form.id ? { ...a, ...item } : a)) : [...(d.assignments ?? []), { ...item, id: crypto.randomUUID(), done: false }] }))
    setForm(null)
  }
  const remove = (id) => update((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) }))
  const finish = (id) => update((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, done: true, doneAt: today } : a)) }))

  const groups = course ? [[course, pending]] : subjects.map((s) => [s.short, pending.filter((a) => a.course === s.short)]).filter(([, l]) => l.length)
  const orphans = course ? [] : pending.filter((a) => !subjects.some((s) => s.short === a.course))
  if (orphans.length) groups.push(['Sin asignatura', orphans])

  return (
    <div className="deliv">
      <div className="deliv-head">
        <h2 className="page-h2">Próximas entregas</h2>
        <History title="Entregas hechas" empty="Aún no has entregado nada" items={done.map((a) => ({ id: a.id, date: a.doneAt ? formatShort(a.doneAt) : '', text: `${a.course} · ${a.title}` }))} />
        <button className="icon-btn" onClick={() => open(null)} aria-label="Añadir entrega" title="Añadir entrega" disabled={!subjects.length}><Icon name="plus" size={22} /></button>
      </div>

      {form && (
        <form className="deliv-form" onSubmit={save}>
          <div className="deliv-kinds" role="radiogroup" aria-label="Tipo de entrega">
            {Object.entries(KINDS).map(([id, k]) => (
              <button type="button" key={id} role="radio" aria-checked={form.kind === id} className={`icon-btn ${form.kind === id ? 'on' : ''}`} title={k.label} aria-label={k.label} onClick={() => setForm({ ...form, kind: id })}><Icon name={k.icon} size={20} /></button>
            ))}
          </div>
          <input className="line-input" autoFocus placeholder="Qué hay que entregar" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={60} />
          {!course && <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} aria-label="Asignatura">{subjects.map((s) => <option key={s.id} value={s.short}>{s.short}</option>)}</select>}
          <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} aria-label="Fecha" />
          <button className="icon-btn on" aria-label="Guardar" title="Guardar" disabled={!form.title.trim() || !form.due}><Icon name="check" size={20} /></button>
          <button type="button" className="icon-btn" aria-label="Cancelar" title="Cancelar" onClick={() => setForm(null)}><Icon name="close" size={20} /></button>
        </form>
      )}

      {groups.map(([short, list]) => (
        <div key={short} className="deliv-group">
          {!course && <span className="deliv-title"><span className="dot" style={{ background: color(short) }} />{short}</span>}
          {list.map((a) => (
            <div key={a.id} className="deliv-row" style={{ background: soft(color(a.course), 16) }}>
              <button className="deliv-ic" style={{ background: soft(color(a.course)) }} onClick={() => finish(a.id)} aria-label={`Marcar «${a.title}» como entregada`} title="Marcar como entregada"><Icon name={KINDS[a.kind]?.icon ?? 'doc'} size={18} /></button>
              <span className="deliv-name w-ellipsis">{a.title}</span>
              <b className={a.due < today ? 'is-late' : ''}>{formatShort(a.due).replace(/^\S+ /, '')}</b>
              <button className="prio-x" onClick={() => open(a)} aria-label={`Editar «${a.title}»`}><Icon name="pen" size={16} /></button>
              <button className="prio-x" onClick={() => remove(a.id)} aria-label={`Eliminar «${a.title}»`}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      ))}
      {pending.length === 0 && !form && <p className="muted">Nada pendiente.</p>}
    </div>
  )
}
