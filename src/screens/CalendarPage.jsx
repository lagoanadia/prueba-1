import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/Icon.jsx'
import Onboarding from '../onboarding/Onboarding.jsx'
import { FLOWS } from '../onboarding/flows.js'
import useAllBoards from '../hooks/useAllBoards.js'
import { AREAS, AREA_IDS, getArea } from '../data/areas.js'
import { TYPES, calendarItems } from '../lib/calendarItems.js'
import { addDays, dayShort, todayISO, weekStart } from '../lib/dates.js'

const VIEWS = [{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]
const FILTERS = [{ id: 'todo', label: 'Todo' }, { id: 'pendientes', label: 'Pendientes' }, { id: 'completadas', label: 'Completadas' }]
const MAX_IN_CELL = 2

const monthOf = (iso) => iso.slice(0, 7)
const label = (iso, opts) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', opts)
/** Cambia de mes: "2026-11-09", +1 -> "2026-12-01" */
const shiftMonth = (iso, n) => { const d = new Date(`${iso.slice(0, 7)}-01T12:00:00`); d.setMonth(d.getMonth() + n); return d.toLocaleDateString('en-CA') }

/** Un "chip" de calendario: color del área + icono del tipo. */
function Chip({ item, onClick }) {
  const color = getArea(item.area)?.color ?? '#DADCE0'
  return (
    <button className={`cal-chip ${item.done ? 'is-done' : ''}`} style={{ '--c': color }} onClick={onClick} title={`${TYPES[item.type].label}: ${item.title}`}>
      <span aria-hidden="true">{TYPES[item.type].glyph}</span><span className="w-ellipsis">{item.title}</span>
    </button>
  )
}

/**
 * Calendario: junta todo lo que tiene fecha en todas las áreas + tus eventos y cumpleaños.
 * Vistas Día / Semana / Mes, filtros Todo / Pendientes / Completadas.
 */
export default function CalendarPage({ entries = [], toggleEntry = () => {} }) {
  const { boards, change, loaded } = useAllBoards(true, [...AREA_IDS, 'calendario'])
  const today = todayISO()
  const [view, setView] = useState('mes')
  const [filter, setFilter] = useState('todo')
  const [cursor, setCursor] = useState(today) // día de referencia de lo que se ve
  const [adding, setAdding] = useState(null) // fecha del evento nuevo (o null)

  // Rango visible
  const monthStart = `${monthOf(cursor)}-01`
  const gridStart = weekStart(monthStart)
  const [from, to] = view === 'mes' ? [gridStart, addDays(gridStart, 41)] : view === 'semana' ? [weekStart(cursor), addDays(weekStart(cursor), 6)] : [cursor, cursor]

  const all = calendarItems({ boards, change, entries, toggleEntry, from, to })
  const items = all.filter((i) => (filter === 'todo' ? true : filter === 'pendientes' ? !i.done : i.done))
  const byDay = (date) => items.filter((i) => i.date === date)

  const calendar = boards.calendario
  if (loaded && calendar && calendar.layout == null && !calendar.data?.onboarded && Object.keys(calendar.data ?? {}).length === 0) {
    return (
      <div className="area">
        <Onboarding area={{ id: 'calendario', label: 'Calendario', color: '#F1F3F4' }} flow={FLOWS.calendario}
          onDone={(answers) => change('calendario', (d) => ({ ...d, ...answers }))} />
      </div>
    )
  }

  const move = (n) => setCursor(view === 'mes' ? shiftMonth(cursor, n) : addDays(cursor, n * (view === 'semana' ? 7 : 1)))
  const title = view === 'mes' ? label(cursor, { month: 'long', year: 'numeric' })
    : view === 'semana' ? `${label(from, { day: 'numeric', month: 'short' })} – ${label(to, { day: 'numeric', month: 'short' })}`
      : label(cursor, { weekday: 'long', day: 'numeric', month: 'long' })
  const openDay = (date) => { setCursor(date); setView('dia') }

  return (
    <div className="area cal">
      <header className="area-head">
        <div>
          <h1 className="sr-only">Calendario</h1>
          <div className="cal-nav">
            <button className="mini" onClick={() => move(-1)} aria-label="Anterior">‹</button>
            <span className="muted cal-range">{title}</span>
            <button className="mini" onClick={() => move(1)} aria-label="Siguiente">›</button>
            {cursor !== today && <button className="pill pill-sm" onClick={() => setCursor(today)}>Hoy</button>}
          </div>
        </div>
        <button className="btn-primary cal-new" onClick={() => setAdding(cursor)}>+ Nuevo evento</button>
      </header>

      <div className="cal-toolbar">
        <div className="chips">{VIEWS.map((v) => <button key={v.id} className={`chip ob-big cal-toggle ${view === v.id ? 'chip-on' : ''}`} onClick={() => setView(v.id)}>{v.label}</button>)}</div>
        <div className="chips">{FILTERS.map((f) => <button key={f.id} className={`chip ob-big cal-toggle ${filter === f.id ? 'chip-on' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>
      </div>
      <div className="cal-legend">
        {Object.values(TYPES).map((t) => <span key={t.label}>{t.glyph} {t.label}</span>)}
        {AREAS.map((a) => <span key={a.id}><span className="dot" style={{ background: a.color }} /> {a.label}</span>)}
      </div>

      {view === 'mes' && (
        <div className="cal-month">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <span key={d} className="cal-wd">{d}</span>)}
          {Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).map((date) => {
            const list = byDay(date)
            return (
              <div key={date} className={`cal-cell ${monthOf(date) !== monthOf(cursor) ? 'is-out' : ''} ${date === today ? 'is-today' : ''}`} onClick={() => openDay(date)}>
                <span className="cal-num">{Number(date.slice(8))}</span>
                {list.slice(0, MAX_IN_CELL).map((it) => <Chip key={it.key} item={it} onClick={(e) => { e.stopPropagation(); openDay(date) }} />)}
                {list.length > MAX_IN_CELL && <span className="cal-more">+{list.length - MAX_IN_CELL} más</span>}
                <span className="cal-dots" aria-hidden="true">{list.slice(0, 4).map((it) => <span key={it.key} style={{ background: getArea(it.area)?.color ?? '#9AA0A6' }} />)}</span>
              </div>
            )
          })}
        </div>
      )}

      {view === 'semana' && (
        <div className="cal-week">
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((date) => (
            <div key={date} className={`cal-col ${date === today ? 'is-today' : ''}`} onClick={() => openDay(date)}>
              <span className="cal-wd">{dayShort(date)} {Number(date.slice(8))}</span>
              {byDay(date).map((it) => <Chip key={it.key} item={it} onClick={(e) => { e.stopPropagation(); openDay(date) }} />)}
            </div>
          ))}
        </div>
      )}

      {view === 'dia' && (
        <div className="card cal-day">
          {byDay(cursor).length === 0 && <p className="muted">Nada este día.</p>}
          <ul>
            {byDay(cursor).map((it) => (
              <li key={it.key} className={it.done ? 'is-done' : ''} style={{ '--c': getArea(it.area)?.color ?? '#DADCE0' }}>
                <span className="cal-day-type">{TYPES[it.type].glyph} {TYPES[it.type].label}</span>
                <span className="cal-day-title">{it.title}</span>
                {getArea(it.area) && <span className="w-hint">{getArea(it.area).label}</span>}
                {it.toggle && <input type="checkbox" checked={it.done} onChange={it.toggle} aria-label={`Marcar «${it.title}»`} />}
                {it.remove && <button className="prio-x" onClick={it.remove} aria-label="Borrar">×</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {adding && createPortal(<NewEvent date={adding} onClose={() => setAdding(null)}
        onSave={(ev) => { change('calendario', (d) => ({ ...d, events: [...(d.events ?? []), { id: crypto.randomUUID(), ...ev }] })); setAdding(null) }} />, document.body)}
    </div>
  )
}

/** Pop-up «Nuevo evento»: título, fecha, tipo y (opcional) área. */
function NewEvent({ date, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(date)
  const [type, setType] = useState('evento')
  const [area, setArea] = useState(null)
  const save = (e) => { e.preventDefault(); if (title.trim() && day) onSave({ title: title.trim(), date: day, type, area, done: false }) }
  return (
    <div className="popup" role="dialog" aria-modal="true" aria-label="Nuevo evento">
      <div className="popup-backdrop" onClick={onClose} />
      <form className="popup-panel new-event" onSubmit={save}>
        <header className="area-head"><h2>Nuevo evento</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button></header>
        <div className="w-form"><input autoFocus placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} /><input type="date" value={day} onChange={(e) => setDay(e.target.value)} style={{ flex: 'none' }} /></div>
        <div className="chips">{['evento', 'cumpleaños', 'tarea'].map((t) => <button type="button" key={t} className={`chip ${type === t ? 'chip-on' : ''}`} onClick={() => setType(t)}>{TYPES[t].glyph} {TYPES[t].label}</button>)}</div>
        <div className="chips">{AREAS.map((a) => <button type="button" key={a.id} className={`chip ${area === a.id ? 'chip-on' : ''}`} style={{ '--c': a.color }} onClick={() => setArea(area === a.id ? null : a.id)}><span className="dot" style={{ background: a.color }} /> {a.label}</button>)}</div>
        <button className="btn-primary" disabled={!title.trim()}>Guardar<span className="btn-arrow"><Icon name="arrow" size={16} strokeWidth={2.6} /></span></button>
      </form>
    </div>
  )
}
