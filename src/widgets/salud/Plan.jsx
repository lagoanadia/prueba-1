import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import Modal from '../../pages/food/Modal.jsx'
import { dayShort, todayISO, weekDays } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'
import { fromMin, toMin } from './healthUtils.js'

const H = 46 // alto de una hora en pantalla
const DEFAULT_VIEW = { from: 8, to: 23, days: [0, 1, 2, 3, 4, 5, 6] }
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/**
 * Plan semanal como un horario: las horas que tú elijas (de 8:00 a 23:00 por defecto) en vertical y los días en columnas.
 * Añades sesiones (deporte, día, hora y minutos); tocar un hueco vacío crea una ahí; tocar una sesión la edita o la marca como hecha.
 */
export default function Plan({ data, update }) {
  const today = todayISO()
  const week = weekDays(today)
  const view = { ...DEFAULT_VIEW, ...(data.planView ?? {}) }
  const sessions = data.planSessions ?? []
  const sports = sportsOf(data)
  const [form, setForm] = useState(null) // null | { id?, sport, day, start, min }
  const [cfg, setCfg] = useState(false)
  const shownDays = view.days.slice().sort((a, b) => a - b)
  const total = Math.max(1, view.to - view.from)

  const saveView = (patch) => update((d) => ({ ...d, planView: { ...DEFAULT_VIEW, ...(d.planView ?? {}), ...patch } }))
  const open = (s, day, start) => setForm(s ? { ...s } : { sport: sports[0] ?? '', day: day ?? shownDays[0] ?? 0, start: start ?? fromMin(view.from * 60), min: 60 })
  const save = (e) => {
    e.preventDefault()
    const f = { ...form, sport: form.sport.trim(), min: Math.max(5, Number(form.min) || 60) }
    if (!f.sport) return
    update((d) => {
      const list = d.planSessions ?? []
      const next = f.id ? list.map((s) => (s.id === f.id ? { ...s, ...f } : s)) : [...list, { id: crypto.randomUUID(), done: {}, ...f }]
      return { ...d, planSessions: next, sports: sportsOf(d).includes(f.sport) ? sportsOf(d) : [...sportsOf(d), f.sport] }
    })
    setForm(null)
  }
  const remove = (id) => { update((d) => ({ ...d, planSessions: (d.planSessions ?? []).filter((s) => s.id !== id), workouts: (d.workouts ?? []).filter((w) => w.planId !== id) })); setForm(null) }
  // Marcar hecha: guarda también el entrenamiento de ese día (así cuenta en Resumen y Constancia)
  const toggleDone = (s, date) => update((d) => {
    const was = Boolean(s.done?.[date])
    return {
      ...d,
      planSessions: (d.planSessions ?? []).map((x) => (x.id === s.id ? { ...x, done: { ...(x.done ?? {}), [date]: !was } } : x)),
      workouts: was ? (d.workouts ?? []).filter((w) => !(w.planId === s.id && w.date === date)) : [...(d.workouts ?? []), { id: crypto.randomUUID(), planId: s.id, date, sport: s.sport, min: s.min, notes: '' }],
    }
  })
  const colClick = (e, day) => {
    if (e.target !== e.currentTarget) return
    const y = e.nativeEvent.offsetY
    const m = Math.floor((view.from * 60 + (y / H) * 60) / 30) * 30
    open(null, day, fromMin(m))
  }

  return (
    <div className="sa-plan">
      <div className="sa-row sa-split">
        <span className="sa-hint">{fromMin(view.from * 60)} – {fromMin(view.to * 60)}</span>
        <span className="sa-row">
          <button className="sa-btn is-soft" onClick={() => setCfg(true)} aria-label="Horas y días que se ven" title="Horas y días"><Icon name="sliders" size={15} /></button>
          <button className="sa-btn" onClick={() => open(null)}><Icon name="plus" size={14} /> Añadir sesión</button>
        </span>
      </div>
      <div className="sa-plan-days" style={{ '--c': shownDays.length }}>
        <span />{shownDays.map((i) => <b key={i} className={week[i] === today ? 'is-today' : ''}>{dayShort(week[i])} {Number(week[i].slice(8))}</b>)}
      </div>
      <div className="sa-plan-grid" style={{ '--c': shownDays.length, '--h': `${total * H}px` }}>
        <div className="sa-plan-hours">{Array.from({ length: total + 1 }, (_, k) => <span key={k} style={{ top: k * H }}>{view.from + k}:00</span>)}</div>
        {shownDays.map((i) => {
          const date = week[i]
          return (
            <div key={i} className={`sa-plan-col ${date === today ? 'is-today' : ''}`} onClick={(e) => colClick(e, i)} role="presentation">
              {Array.from({ length: total }, (_, k) => <i key={k} style={{ top: k * H }} />)}
              {sessions.filter((s) => s.day === i).map((s) => {
                const top = ((toMin(s.start) - view.from * 60) / 60) * H
                const height = (s.min / 60) * H
                if (top + height <= 0 || top >= total * H) return null
                const done = Boolean(s.done?.[date])
                return (
                  <button key={s.id} className={`sa-sess ${done ? 'is-done' : ''}`} style={{ top: top + 2, height: height - 4, '--c': colorOf(sports, s.sport) }} onClick={() => open(s)} title="Toca para editar">
                    <b>{s.sport}</b><span>{s.start}–{fromMin(toMin(s.start) + s.min)} · {s.min} min</span>{done && <em>Hecho</em>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {form && (
        <Modal title={form.id ? 'Editar sesión' : 'Nueva sesión'} icon="clock" onClose={() => setForm(null)}>
          <form className="fd-form" onSubmit={save}>
            <input className="fd-input" autoFocus list="sa-sports" placeholder="Deporte o actividad" value={form.sport} maxLength={30} onChange={(e) => setForm({ ...form, sport: e.target.value })} aria-label="Deporte" />
            <datalist id="sa-sports">{sports.map((s) => <option key={s} value={s} />)}</datalist>
            <div className="fd-chips">{DAY_LABELS.map((d, i) => <button type="button" key={d} className={`fd-chip ${form.day === i ? 'is-on' : ''}`} onClick={() => setForm({ ...form, day: i })}>{d}</button>)}</div>
            <div className="fd-row"><input type="time" className="fd-input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} aria-label="Hora de inicio" /><input type="number" className="fd-input" min="5" step="5" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} aria-label="Minutos" /><span className="fd-hint">min</span></div>
            <div className="fd-row">
              {form.id && <button type="button" className="fd-circle fd-danger" onClick={() => remove(form.id)} aria-label="Borrar sesión" title="Borrar"><Icon name="trash" size={20} /></button>}
              {form.id && <button type="button" className="fd-pill" onClick={() => { toggleDone(sessions.find((x) => x.id === form.id), week[form.day]); setForm(null) }}><Icon name="check" size={14} />{sessions.find((x) => x.id === form.id)?.done?.[week[form.day]] ? 'Quitar «hecho»' : 'Marcar hecha esta semana'}</button>}
              <span className="fd-grow" />
              <button className="fd-ok" disabled={!form.sport.trim()} aria-label="Guardar" title="Guardar"><Icon name="check" size={20} /></button>
            </div>
          </form>
        </Modal>
      )}

      {cfg && (
        <Modal title="Horas y días" icon="sliders" onClose={() => setCfg(false)}>
          <div className="fd-form">
            <div className="fd-row"><span className="fd-hint">Desde</span>
              <select className="fd-input" value={view.from} onChange={(e) => saveView({ from: Math.min(Number(e.target.value), view.to - 1) })} aria-label="Primera hora">{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}</select>
              <span className="fd-hint">hasta</span>
              <select className="fd-input" value={view.to} onChange={(e) => saveView({ to: Math.max(Number(e.target.value), view.from + 1) })} aria-label="Última hora">{Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{h}:00</option>)}</select>
            </div>
            <div className="fd-chips">{DAY_LABELS.map((d, i) => (
              <button type="button" key={d} className={`fd-chip ${view.days.includes(i) ? 'is-on' : ''}`} aria-pressed={view.days.includes(i)}
                onClick={() => { const next = view.days.includes(i) ? view.days.filter((x) => x !== i) : [...view.days, i]; if (next.length) saveView({ days: next }) }}>{d}</button>
            ))}</div>
          </div>
        </Modal>
      )}
    </div>
  )
}
