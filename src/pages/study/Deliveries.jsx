import Select from '../../components/Select.jsx'
import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import History from '../../components/History.jsx'
import { daysUntil, formatLong, formatShort, todayISO } from '../../lib/dates.js'
import { KINDS, soft } from './helpers.js'

/**
 * Próximas entregas: se pueden añadir, editar y quitar a mano; cada una lleva el icono de su tipo.
 * Si `course` viene, solo muestra las de esa asignatura; si no, todas agrupadas por asignatura.
 */
export default function Deliveries({ data, update, subjects, course = null, exams = false }) {
  const today = todayISO()
  // Los exámenes son un widget aparte: aquí solo salen los que cuadran con este modo
  const all = (data.assignments ?? []).filter((a) => (course ? a.course === course : true) && ((a.kind === 'examen') === exams))
  const pending = all.filter((a) => !a.done && !a.tick).sort((a, b) => a.due.localeCompare(b.due))
  const ticked = all.filter((a) => !a.done && a.tick).sort((a, b) => a.due.localeCompare(b.due))
  const done = all.filter((a) => a.done)
  const [form, setForm] = useState(null) // null cerrado · { id?, title, course, due, kind }
  const [kindOpen, setKindOpen] = useState(false)
  const [view, setView] = useState('count') // exámenes: 'count' = el más cercano en grande · 'list' = todos
  const swipe = useRef(null)
  const upd = useRef(update)
  upd.current = update
  useEffect(() => {
    const commit = () => upd.current((d) => ((d.assignments ?? []).some((a) => a.tick && !a.done) ? { ...d, assignments: d.assignments.map((a) => (a.tick && !a.done ? { ...a, done: true, doneAt: a.tickAt ?? today, tick: false, tickAt: null } : a)) } : d))
    commit() // lo marcado en una visita anterior ya cuenta como entregado
    return commit // y al salir de la pantalla, lo de esta visita
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const kinds = Object.entries(KINDS).filter(([id]) => id !== 'examen') // los exámenes tienen su propio widget
  const color = (c) => subjects.find((s) => s.short === c)?.color ?? '#9AA0A6'

  const open = (a) => setForm(a ? { ...a, kind: a.kind === 'proyecto' ? 'trabajo' : a.kind } : { title: '', course: course ?? subjects[0]?.short ?? '', due: '', kind: exams ? 'examen' : 'practica' })
  const save = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.due || !form.course) return
    const item = { ...form, title: form.title.trim() }
    update((d) => ({ ...d, assignments: form.id ? d.assignments.map((a) => (a.id === form.id ? { ...a, ...item } : a)) : [...(d.assignments ?? []), { ...item, id: crypto.randomUUID(), done: false }] }))
    setForm(null)
  }
  const remove = (id) => update((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) }))
  // Marcar: pasa a «Entregadas» (más oscura, debajo) y se puede desmarcar con otro clic; solo al salir de esta pantalla pasa de verdad a hecha
  const tick = (id) => update((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, tick: true, tickAt: today } : a)) }))
  const restore = (id) => update((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, done: false, doneAt: null, tick: false, tickAt: null } : a)) })) // desde el reloj
  const untick = (id) => update((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, tick: false, tickAt: null } : a)) }))

  const daysText = (d) => { const n = daysUntil(d); return n < 0 ? `hace ${-n} d` : n === 0 ? 'hoy' : `${n} días` }
  const groups = course ? [[course, pending]] : subjects.map((s) => [s.short, pending.filter((a) => a.course === s.short)]).filter(([, l]) => l.length)
  const orphans = course ? [] : pending.filter((a) => !subjects.some((s) => s.short === a.course))
  if (orphans.length) groups.push(['Sin asignatura', orphans])

  return (
    <div className="deliv">
      <div className="deliv-head">
        <h2 className="page-h2"><span className="dot-study" aria-hidden="true" />{exams ? 'Exámenes' : 'Próximas entregas'}</h2>
        <History title={exams ? 'Exámenes hechos' : 'Entregas hechas'} empty={exams ? 'Aún no has hecho ninguno' : 'Aún no has entregado nada'} items={done.map((a) => ({ id: a.id, date: a.doneAt ? formatShort(a.doneAt) : '', text: `${a.course} · ${a.title}` }))} onRestore={restore} />
        <button className="icon-btn" onClick={() => open(null)} aria-label={exams ? 'Añadir examen' : 'Añadir entrega'} title={exams ? 'Añadir examen' : 'Añadir entrega'} disabled={!subjects.length}><Icon name="plus" size={22} /></button>
      </div>

      {form && (
        <form className="deliv-form" onSubmit={save}>
          {!exams && (
            <div className="deliv-kind">
              <button type="button" className="kind-btn" onClick={() => setKindOpen(!kindOpen)} aria-expanded={kindOpen} aria-label="Tipo de entrega">
                <Icon name={KINDS[form.kind]?.icon ?? 'doc'} size={16} />{KINDS[form.kind]?.label ?? 'Tipo'}<Icon name="down" size={12} strokeWidth={2.6} />
              </button>
              {kindOpen && (
                <>
                  <span className="sc-back" onClick={() => setKindOpen(false)} />
                  <div className="card kind-menu" role="listbox" aria-label="Tipo de entrega">
                    {kinds.map(([id, k]) => (
                      <button type="button" key={id} role="option" aria-selected={form.kind === id} className={form.kind === id ? 'on' : ''} onClick={() => { setForm({ ...form, kind: id }); setKindOpen(false) }}><Icon name={k.icon} size={18} />{k.label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <input className="line-input" autoFocus placeholder={exams ? 'Qué examen es' : 'Qué hay que entregar'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={60} />
          {!course && <Select value={form.course} label="Asignatura" onChange={(v) => setForm({ ...form, course: v })} options={subjects.map((s) => ({ value: s.short, label: s.short, color: s.color }))} />}
          <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} aria-label="Fecha" />
          <button className="icon-btn on" aria-label="Guardar" title="Guardar" disabled={!form.title.trim() || !form.due}><Icon name="check" size={20} /></button>
          <button type="button" className="icon-btn" aria-label="Cancelar" title="Cancelar" onClick={() => setForm(null)}><Icon name="close" size={20} /></button>
        </form>
      )}

      {exams && view === 'count' && pending.length > 0 && !form ? (
        <div className="exam-count">
          <span className="exam-count-name">{pending[0].course} · {pending[0].title}</span>
          <div className={`exam-count-n ${pending[0].due < today ? 'is-late' : ''}`} style={{ color: pending[0].due < today ? undefined : color(pending[0].course) }}>{Math.abs(daysUntil(pending[0].due))}<small>{Math.abs(daysUntil(pending[0].due)) === 1 ? 'día' : 'días'}</small></div>
          <span className="muted">{daysUntil(pending[0].due) < 0 ? 'hace' : daysUntil(pending[0].due) === 0 ? 'es hoy' : 'faltan'} · {formatLong(pending[0].due)}</span>
          {pending.length > 1 && <div className="exam-next">{pending.slice(1, 4).map((a) => <span key={a.id} style={{ background: soft(color(a.course), 40) }}>{a.course} {Math.max(daysUntil(a.due), 0)} d</span>)}</div>}
        </div>
      ) : (
        <>
      {groups.map(([short, list]) => (
        <div key={short} className="deliv-group">
          {!course && <span className="deliv-title"><span className="dot" style={{ background: color(short) }} />{short}</span>}
          {list.map((a) => (
            <div key={a.id} className="deliv-row is-click" style={{ background: soft(color(a.course), 16) }} role="button" tabIndex={0}
              onClick={() => tick(a.id)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tick(a.id) } }}
              aria-label={`Marcar «${a.title}» como hecha`} title="Toca para marcarla como hecha">
              <span className="deliv-ic" style={{ background: soft(color(a.course), 55) }} aria-hidden="true"><Icon name={KINDS[a.kind]?.icon ?? 'doc'} size={18} /></span>
              <span className="deliv-name w-ellipsis">{a.title}</span>
              {exams ? <span className={`exam-chip ${a.due < today ? 'is-late' : ''}`}>{daysText(a.due)}</span> : <b className={a.due < today ? 'is-late' : ''}>{formatShort(a.due).replace(/^\S+ /, '')}</b>}
              <button className="prio-x" onClick={(e) => { e.stopPropagation(); open(a) }} aria-label={`Editar «${a.title}»`}><Icon name="pen" size={16} /></button>
              <button className="prio-x" onClick={(e) => { e.stopPropagation(); remove(a.id) }} aria-label={`Eliminar «${a.title}»`}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      ))}
        </>
      )}
      {ticked.length > 0 && !form && (
        <div className="deliv-done">
          <span className="deliv-title"><Icon name="check" size={14} strokeWidth={3} />{exams ? 'Hechos' : 'Entregadas'}</span>
          {ticked.map((a) => (
            <div key={a.id} className="deliv-row is-ticked" style={{ background: soft(color(a.course), 42) }} role="button" tabIndex={0} onClick={() => untick(a.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); untick(a.id) } }} aria-label={`Desmarcar «${a.title}»`} title="Toca para volver a ponerla pendiente">
              <span className="deliv-ic" style={{ background: color(a.course), color: '#fff' }} aria-hidden="true"><Icon name="check" size={16} color="#fff" strokeWidth={3} /></span>
              <span className="deliv-name w-ellipsis">{a.course} · {a.title}</span>
            </div>
          ))}
        </div>
      )}
      {pending.length === 0 && ticked.length === 0 && !form && <p className="muted">{exams ? 'Sin exámenes.' : 'Nada pendiente.'}</p>}
      {exams && pending.length > 0 && !form && (
        <div className="exam-pager" onPointerDown={(e) => { swipe.current = e.clientX }} onPointerUp={(e) => { if (swipe.current == null) return; const dx = e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 40) setView(dx < 0 ? 'list' : 'count') }}>
          <button className="fd-ib" onClick={() => setView('count')} disabled={view === 'count'} aria-label="Cuenta atrás"><Icon name="left" size={14} /></button>
          <span className="exam-dots"><i className={view === 'count' ? 'on' : ''} /><i className={view === 'list' ? 'on' : ''} /></span>
          <button className="fd-ib" onClick={() => setView('list')} disabled={view === 'list'} aria-label="Lista de exámenes"><Icon name="right" size={14} /></button>
        </div>
      )}
    </div>
  )
}
