import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import Modal from '../../pages/food/Modal.jsx'
import { dayShort, todayISO, weekDays } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'
import { fmtHM, fromMin, toMin } from './healthUtils.js'

const H = 46 // alto de una hora en pantalla
const SNAP = 15 // minutos: las sesiones se ajustan de 15 en 15
const MIN_SESSION = 15
const DEFAULT_MIN = 60
const DEFAULT_VIEW = { from: 8, to: 23, days: [0, 1, 2, 3, 4, 5, 6] }
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const snap = (m) => Math.round(m / SNAP) * SNAP

/**
 * Ejercicio de la semana, como un horario (las horas y días que tú elijas):
 *  - Los deportes son globitos: arrástralos a un día y una hora y la sesión queda puesta ahí (también tocándolos).
 *  - Tira del borde de arriba o de abajo de una sesión para hacerla más corta o más larga; arrástrala para moverla.
 *  - Tocarla la marca como hecha (cuenta en Resumen y Constancia) y la × la quita. Nada de ventanas.
 */
export default function Plan({ data, update }) {
  const today = todayISO()
  const week = weekDays(today)
  const view = { ...DEFAULT_VIEW, ...(data.planView ?? {}) }
  const sessions = data.planSessions ?? []
  const sports = sportsOf(data)
  const [cfg, setCfg] = useState(false)
  const [dropDay, setDropDay] = useState(null) // columna resaltada mientras arrastras un deporte
  const [newSport, setNewSport] = useState(null) // null | texto del deporte que estás escribiendo
  const [durFor, setDurFor] = useState(null) // deporte cuyo tiempo habitual se está ajustando
  const [live, setLive] = useState(null) // { id, day?, start?, min? } mientras tiras de una sesión
  const shownDays = view.days.slice().sort((a, b) => a - b)
  const total = Math.max(1, view.to - view.from)
  const lo = view.from * 60
  const hi = view.to * 60

  const saveView = (patch) => update((d) => ({ ...d, planView: { ...DEFAULT_VIEW, ...(d.planView ?? {}), ...patch } }))
  const addSport = (name) => { const n = name.trim(); if (n) update((d) => ({ ...d, sports: sportsOf(d).includes(n) ? sportsOf(d) : [...sportsOf(d), n] })); setNewSport(null) }
  const removeSport = (name) => update((d) => ({ ...d, sports: sportsOf(d).filter((x) => x !== name) }))
  // Poner una sesión directamente (solo lleva el deporte, el día, la hora y cuánto dura)
  const usual = (sport) => data.sportMin?.[sport] ?? DEFAULT_MIN // lo que sueles hacer de ese deporte
  const setUsual = (sport, min) => update((d) => ({ ...d, sportMin: { ...(d.sportMin ?? {}), [sport]: Math.min(Math.max(min, MIN_SESSION), 600) } }))
  const place = (sport, day, startMin, min = usual(sport)) => {
    const start = Math.min(Math.max(snap(startMin), lo), hi - MIN_SESSION)
    const len = Math.min(min, hi - start)
    update((d) => ({ ...d, planSessions: [...(d.planSessions ?? []), { id: crypto.randomUUID(), done: {}, sport, day, start: fromMin(start), min: len }] }))
  }
  // Soltar un globito en una columna
  const onDropSport = (e, day) => {
    e.preventDefault(); setDropDay(null)
    const sport = e.dataTransfer.getData('text/plain')
    if (!sport) return
    const r = e.currentTarget.getBoundingClientRect()
    const z = parseFloat(getComputedStyle(e.currentTarget.closest('.d-app') ?? document.body).zoom) || 1 // la vista de escritorio va con zoom
    place(sport, day, lo + (((e.clientY - r.top) / z) / H) * 60)
  }
  // Tocar un globito: se pone hoy (o el primer día visible) a la próxima hora en punto
  const quickAdd = (sport) => {
    const now = new Date()
    const day = shownDays.includes((now.getDay() + 6) % 7) ? (now.getDay() + 6) % 7 : shownDays[0] ?? 0
    place(sport, day, Math.min(Math.max(Math.ceil((now.getHours() * 60 + now.getMinutes()) / 60) * 60, lo), hi - Math.min(usual(sport), hi - lo)))
    setDurFor(null)
  }
  const remove = (id) => update((d) => ({ ...d, planSessions: (d.planSessions ?? []).filter((s) => s.id !== id), workouts: (d.workouts ?? []).filter((w) => w.planId !== id) }))
  // Marcar hecha: guarda también el entrenamiento de ese día (así cuenta en Resumen y Constancia)
  const toggleDone = (s, date) => update((d) => {
    const was = Boolean(s.done?.[date])
    return {
      ...d,
      planSessions: (d.planSessions ?? []).map((x) => (x.id === s.id ? { ...x, done: { ...(x.done ?? {}), [date]: !was } } : x)),
      workouts: was ? (d.workouts ?? []).filter((w) => !(w.planId === s.id && w.date === date)) : [...(d.workouts ?? []), { id: crypto.randomUUID(), planId: s.id, date, sport: s.sport, min: s.min, notes: '' }],
    }
  })
  const commit = (s, patch) => update((d) => ({
    ...d,
    planSessions: (d.planSessions ?? []).map((x) => (x.id === s.id ? { ...x, ...patch } : x)),
    workouts: (d.workouts ?? []).map((w) => (w.planId === s.id && patch.min ? { ...w, min: patch.min } : w)), // lo ya hecho sigue la misma duración
  }))

  // Tirar de una sesión: arriba/abajo = cambiar su duración · el cuerpo = moverla (un toque sin mover = marcar hecha)
  const pull = (e, s, mode) => {
    e.preventDefault(); e.stopPropagation()
    const grid = e.currentTarget.closest('.sa-plan-grid')
    const scale = grid.getBoundingClientRect().height / grid.offsetHeight || 1
    const s0 = toMin(s.start)
    const m0 = s.min
    const y0 = e.clientY
    let patch = {}
    let moved = false
    const move = (ev) => {
      const dm = ((ev.clientY - y0) / scale / H) * 60
      if (Math.abs(ev.clientY - y0) > 3 || (mode === 'body' && Math.abs(ev.clientX - e.clientX) > 3)) moved = true
      if (mode === 'bottom') patch = { min: Math.min(Math.max(snap(m0 + dm), MIN_SESSION), hi - s0) }
      else if (mode === 'top') { const ns = Math.min(Math.max(snap(s0 + dm), lo), s0 + m0 - MIN_SESSION); patch = { start: fromMin(ns), min: s0 + m0 - ns } }
      else {
        const ns = Math.min(Math.max(snap(s0 + dm), lo), hi - m0)
        const col = document.elementsFromPoint(ev.clientX, ev.clientY).find((n) => n.classList?.contains('sa-plan-col'))
        patch = { start: fromMin(ns), ...(col ? { day: Number(col.dataset.day) } : {}) }
      }
      setLive({ id: s.id, ...patch })
    }
    const end = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end)
      setLive(null)
      if (moved && Object.keys(patch).length) commit(s, patch)
      else if (mode === 'body') toggleDone(s, week[s.day])
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
  }

  const shown = sessions.map((s) => (live?.id === s.id ? { ...s, ...live } : s))

  return (
    <div className="sa-plan">
      <div className="sa-row sa-split">
        <span className="sa-hint">{fromMin(lo)} – {fromMin(hi)}</span>
        <button className="sa-btn is-soft" onClick={() => setCfg(true)} aria-label="Horas y días que se ven" title="Horas y días"><Icon name="sliders" size={15} /></button>
      </div>
      <div className="sa-sportbar" aria-label="Deportes: arrástralos al plan">
        {sports.map((sp) => (
          <span key={sp} className="sa-bubble" style={{ '--c': colorOf(sports, sp) }}>
            <button type="button" draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', sp); setDurFor(null) }} onClick={() => setDurFor(durFor === sp ? null : sp)} aria-expanded={durFor === sp} title="Arrástralo al plan · pulsa para fijar cuánto sueles hacer">{sp}</button>
            <button type="button" className="sa-bubble-x" onClick={() => removeSport(sp)} aria-label={`Quitar ${sp} de la lista`} title="Quitar de la lista"><Icon name="close" size={11} strokeWidth={3} /></button>
            {durFor === sp && (
              <>
                <span className="sa-dur-back" onClick={() => setDurFor(null)} />
                <span className="card sa-dur" role="dialog" aria-label={`Tiempo habitual de ${sp}`} onKeyDown={(e) => e.key === 'Escape' && setDurFor(null)}>
                  <span className="sa-dur-t">Lo que sueles hacer</span>
                  <span className="sa-dur-row">
                    <button type="button" onClick={() => setUsual(sp, usual(sp) - SNAP)} aria-label="Menos tiempo">−</button>
                    <b>{fmtHM(usual(sp))}</b>
                    <button type="button" onClick={() => setUsual(sp, usual(sp) + SNAP)} aria-label="Más tiempo">+</button>
                  </span>
                  <button type="button" className="sa-btn" onClick={() => quickAdd(sp)}>Poner hoy</button>
                </span>
              </>
            )}
          </span>
        ))}
        {newSport === null
          ? <button type="button" className="sa-bubble-add" onClick={() => setNewSport('')}><Icon name="plus" size={13} strokeWidth={2.8} /> Deporte</button>
          : <input className="sa-bubble-in" autoFocus value={newSport} maxLength={30} placeholder="Deporte" aria-label="Nuevo deporte" onChange={(e) => setNewSport(e.target.value)} onBlur={() => addSport(newSport)} onKeyDown={(e) => { if (e.key === 'Enter') addSport(newSport); if (e.key === 'Escape') setNewSport(null) }} />}
      </div>
      <div className="sa-plan-days" style={{ '--c': shownDays.length }}>
        <span />{shownDays.map((i) => <b key={i} className={week[i] === today ? 'is-today' : ''}>{dayShort(week[i])} {Number(week[i].slice(8))}</b>)}
      </div>
      <div className="sa-plan-grid" style={{ '--c': shownDays.length, '--h': `${total * H}px` }}>
        <div className="sa-plan-hours">{Array.from({ length: total + 1 }, (_, k) => <span key={k} style={{ top: k * H }}>{view.from + k}:00</span>)}</div>
        {shownDays.map((i) => {
          const date = week[i]
          return (
            <div key={i} data-day={i} className={`sa-plan-col ${date === today ? 'is-today' : ''} ${dropDay === i ? 'is-drop' : ''}`} role="presentation"
              onDragOver={(e) => { e.preventDefault(); if (dropDay !== i) setDropDay(i) }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropDay(null) }} onDrop={(e) => onDropSport(e, i)}>
              {Array.from({ length: total }, (_, k) => <i key={k} style={{ top: k * H }} />)}
              {shown.filter((s) => s.day === i).map((s) => {
                const top = ((toMin(s.start) - lo) / 60) * H
                const height = (s.min / 60) * H
                if (top + height <= 0 || top >= total * H) return null
                const done = Boolean(s.done?.[date])
                return (
                  <div key={s.id} className={`sa-sess ${done ? 'is-done' : ''} ${live?.id === s.id ? 'is-live' : ''}`} style={{ top: top + 1, height: height - 2, '--c': colorOf(sports, s.sport) }}
                    role="button" tabIndex={0} aria-label={`${s.sport}, ${s.start} a ${fromMin(toMin(s.start) + s.min)}. Toca para marcarla como hecha`} title="Toca: hecha · arrastra: mover · tira de los bordes: duración"
                    onPointerDown={(e) => pull(e, s, 'body')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDone(s, date) } }}>
                    <span className="sa-rz sa-rz-t" onPointerDown={(e) => pull(e, s, 'top')} aria-hidden="true" />
                    <b>{s.sport}</b><span>{s.start}–{fromMin(toMin(s.start) + s.min)}</span>{done && <em>Hecho</em>}
                    <button type="button" className="sa-sess-x" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); remove(s.id) }} aria-label={`Quitar ${s.sport}`} title="Quitar"><Icon name="close" size={11} strokeWidth={3} /></button>
                    <span className="sa-rz sa-rz-b" onPointerDown={(e) => pull(e, s, 'bottom')} aria-hidden="true" />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

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
