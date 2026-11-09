import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { addDays, dayShort, todayISO, weekStart } from '../../lib/dates.js'
import { projectsOf } from '../../widgets/trabajo/projects.js'
import { PROJECT_COLORS, colorOf, soft, toHHMM, toMin } from './shared.js'

const ROW = 44 // px por hora
const STEP = 15 // minutos al colocar

/**
 * Agenda semanal: toca un hueco para apuntar una reunión (o lo que quieras) a esa hora;
 * toca un evento para cambiarlo. En móvil se ve un día cada vez. Lo de hoy sale también en Inicio y en el Calendario.
 */
export default function AgendaBlock({ data, update }) {
  const today = todayISO()
  const narrow = useMediaQuery('(max-width: 899px)')
  const [anchor, setAnchor] = useState(today)
  const [draft, setDraft] = useState(null) // evento que se está creando o editando
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id) }, [])

  const events = data.meetings ?? []
  const days = narrow ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i))
  const inView = events.filter((e) => days.includes(e.date))
  // Horas visibles: 8–20, ampliadas si hay algo antes o después
  const first = Math.min(8, ...inView.map((e) => Math.floor(toMin(e.start) / 60)))
  const last = Math.max(20, ...inView.map((e) => Math.ceil(toMin(e.end) / 60)))
  const hours = Array.from({ length: last - first }, (_, i) => first + i)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const step = narrow ? 1 : 7

  const save = (ev) => {
    if (!ev.title.trim() || toMin(ev.end) <= toMin(ev.start)) return
    update((d) => {
      const list = d.meetings ?? []
      const { isNew, ...rest } = ev // eslint-disable-line no-unused-vars
      const clean = { ...rest, title: ev.title.trim() }
      return { ...d, meetings: list.some((x) => x.id === ev.id) ? list.map((x) => (x.id === ev.id ? clean : x)) : [...list, clean] }
    })
    setDraft(null)
  }
  const remove = (id) => { update((d) => ({ ...d, meetings: (d.meetings ?? []).filter((x) => x.id !== id) })); setDraft(null) }
  const newAt = (date, e) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const start = Math.max(first * 60, Math.min((last - 1) * 60, first * 60 + Math.floor((y / ROW) * 60 / STEP) * STEP))
    setDraft({ id: crypto.randomUUID(), date, start: toHHMM(start), end: toHHMM(start + 60), title: '', projectId: null, isNew: true })
  }
  const colorFor = (ev) => (ev.projectId ? colorOf(data, ev.projectId) : ev.color ?? '#3185FC')

  return (
    <div className="agenda">
      <div className="agenda-nav">
        <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, -step))} aria-label="Anterior"><Icon name="left" size={18} /></button>
        <button className="pill pill-sm" onClick={() => setAnchor(today)} disabled={days.includes(today)}>Hoy</button>
        <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, step))} aria-label="Siguiente"><Icon name="right" size={18} /></button>
        <span className="muted agenda-range">{new Date(`${days[0]}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{days.length > 1 && ` – ${new Date(`${days[6]}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}</span>
      </div>

      <div className="agenda-grid" style={{ '--cols': days.length, '--row': `${ROW}px` }}>
        <span />
        {days.map((d) => <span key={d} className={`agenda-day ${d === today ? 'is-today' : ''}`}>{dayShort(d)} <b>{Number(d.slice(8))}</b></span>)}
        <div className="agenda-hours">{hours.map((h) => <span key={h}>{h}:00</span>)}</div>
        {days.map((d) => (
          <div key={d} className={`agenda-col ${d === today ? 'is-today' : ''}`} style={{ height: hours.length * ROW }} onClick={(e) => e.target === e.currentTarget && newAt(d, e)} title="Toca para apuntar algo">
            {d === today && nowMin >= first * 60 && nowMin <= last * 60 && <span className="agenda-now" style={{ top: ((nowMin - first * 60) / 60) * ROW }} />}
            {[...events.filter((e) => e.date === d), ...(draft?.isNew && draft.date === d ? [draft] : [])].map((ev) => {
              const top = ((toMin(ev.start) - first * 60) / 60) * ROW
              const h = Math.max(22, ((toMin(ev.end) - toMin(ev.start)) / 60) * ROW - 2)
              const c = colorFor(ev)
              return (
                <button key={ev.id} className={`agenda-ev ${draft?.id === ev.id ? 'is-editing' : ''}`} style={{ top, height: h, background: soft(c, 40), borderColor: c }}
                  onClick={() => setDraft({ ...ev })}>
                  <b>{ev.title || 'Nuevo'}</b>{h > 34 && <span>{ev.start}–{ev.end}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {draft && (
        <form className="card agenda-edit" onSubmit={(e) => { e.preventDefault(); save(draft) }}>
          <input autoFocus placeholder="Reunión con…" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={60} aria-label="Título" />
          <span className="agenda-times">
            <Icon name="clock" size={16} />
            <input type="time" value={draft.start} step={STEP * 60} onChange={(e) => e.target.value && setDraft({ ...draft, start: e.target.value })} aria-label="Empieza" />
            <span>–</span>
            <input type="time" value={draft.end} step={STEP * 60} onChange={(e) => e.target.value && setDraft({ ...draft, end: e.target.value })} aria-label="Acaba" />
          </span>
          <span className="agenda-colors">
            {projectsOf(data).map((p) => (
              <button type="button" key={p.id} className={`seg-chip ${draft.projectId === p.id ? 'on' : ''}`} style={{ background: soft(colorOf(data, p.id), 35) }} onClick={() => setDraft({ ...draft, projectId: draft.projectId === p.id ? null : p.id })}>{p.name}</button>
            ))}
            {!draft.projectId && PROJECT_COLORS.slice(0, 5).map((c) => (
              <button type="button" key={c} className={`agenda-swatch ${(draft.color ?? '#3185FC') === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })} aria-label="Color" />
            ))}
          </span>
          <span className="agenda-actions">
            {!draft.isNew && <button type="button" className="icon-btn" onClick={() => remove(draft.id)} aria-label="Borrar"><Icon name="trash" size={18} /></button>}
            <button type="button" className="icon-btn" onClick={() => setDraft(null)} aria-label="Cancelar"><Icon name="close" size={18} /></button>
            <button className="icon-btn on" disabled={!draft.title.trim() || toMin(draft.end) <= toMin(draft.start)} aria-label="Guardar"><Icon name="check" size={18} /></button>
          </span>
        </form>
      )}
    </div>
  )
}
