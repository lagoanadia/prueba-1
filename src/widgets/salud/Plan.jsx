import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import Select from '../../components/Select.jsx'
import Modal from '../../pages/food/Modal.jsx'
import { dayShort, todayISO, weekDays } from '../../lib/dates.js'
import { colorOf, sportsOf } from './sports.js'
import SportIcon, { ICON_KEYS, guessIcon, iconOf, stampOf } from './SportIcon.jsx'
import { fmtHM, fromMin, toMin } from './healthUtils.js'

const MIN_H = 16 // el horario se adapta al espacio disponible del widget; solo en casos extremos baja de este alto por hora
const SNAP = 15 // minutos: las sesiones se ajustan de 15 en 15
const MIN_SESSION = 15
const DEFAULT_MIN = 60
const DEFAULT_VIEW = { from: 8, to: 23, days: [0, 1, 2, 3, 4, 5, 6] }
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const snap = (m) => Math.round(m / SNAP) * SNAP

/** El nombre del deporte siempre se ve entero: la letra se encoge (de 15 a 7 px) hasta que la palabra cabe en la columna. */
function SessName({ text, max = 15, single = false }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const fit = () => {
      el.style.overflow = ''; el.style.textOverflow = ''
      // 1.º en una línea hasta 9 px; si no cabe, en varias líneas (sin partir ninguna palabra), encogiendo hasta que la palabra más larga quepa
      el.style.whiteSpace = 'nowrap'
      let fs = max
      el.style.fontSize = `${fs}px`
      while (el.scrollWidth > el.clientWidth + 0.5 && fs > Math.min(9, max)) { fs -= 0.5; el.style.fontSize = `${fs}px` }
      if (el.scrollWidth <= el.clientWidth + 0.5) return
      if (single) { el.style.overflow = 'hidden'; el.style.textOverflow = 'ellipsis'; return } // bloque corto: una línea y, si no cabe, puntos suspensivos (el nombre entero sale en la tarjeta flotante)
      el.style.whiteSpace = 'normal'
      fs = 12
      el.style.fontSize = `${fs}px`
      while (el.scrollWidth > el.clientWidth + 0.5 && fs > 6) { fs -= 0.5; el.style.fontSize = `${fs}px` }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [text, max, single])
  return <b ref={ref} className="sa-name">{text}</b>
}

/** Plan en M: solo lo de hoy, en una línea de tiempo con la hora de ahora, y cuál es la siguiente sesión. */
function PlanToday({ data, view, sessions, sports, today }) {
  const dayIdx = (new Date(`${today}T12:00:00`).getDay() + 6) % 7
  const mine = sessions.filter((s) => s.day === dayIdx).sort((a, b) => toMin(a.start) - toMin(b.start))
  const lo = view.from * 60
  const hi = view.to * 60
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  const pct = (m) => `${Math.min(100, Math.max(0, ((m - lo) / (hi - lo)) * 100))}%`
  const next = mine.find((s) => toMin(s.start) + s.min > now)
  const ticks = [view.from, Math.round((view.from + view.to) / 2), view.to]
  return (
    <div className="pt">
      <div className="pt-line" role="img" aria-label={mine.length ? `Hoy: ${mine.map((s) => `${s.sport} a las ${s.start}`).join(', ')}` : 'Hoy no hay nada planeado'}>
        {mine.map((s) => (
          <span key={s.id} className={`pt-blk ${s.done?.[today] ? 'is-done' : ''}`} style={{ left: pct(toMin(s.start)), width: `calc(${pct(toMin(s.start) + s.min)} - ${pct(toMin(s.start))})`, '--c': colorOf(sports, s.sport) }} title={`${s.sport} · ${s.start} – ${fromMin(toMin(s.start) + s.min)}`}>
            <SportIcon name={iconOf(data, s.sport)} size={16} /><em>{s.sport}</em>
          </span>
        ))}
        {now >= lo && now <= hi && <i className="pt-now" style={{ left: pct(now) }} />}
      </div>
      <div className="pt-ticks">{ticks.map((h) => <span key={h}>{h}:00</span>)}</div>
      <div className="pt-foot">
        <span className="sa-label">Hoy · {dayShort(today)} {Number(today.slice(8))}</span>
        <span className={`cy-chip pt-next ${next ? '' : 'is-none'}`}>{mine.length === 0 ? 'Hoy descansas' : next ? `Siguiente: ${next.sport} ${next.start}` : 'Hoy ya está hecho'}</span>
      </div>
    </div>
  )
}

/**
 * Ejercicio de la semana, como un horario (las horas y días que tú elijas):
 *  - Los deportes son globitos: arrástralos a un día y una hora y la sesión queda puesta ahí (también tocándolos).
 *  - Tira del borde de arriba o de abajo de una sesión para hacerla más corta o más larga: se ilumina la línea de la hora y sale cuál es.
 *  - Agárrala por el centro y llévala donde quieras (otro día, otra hora); sin solaparse con otras.
 *  - Tocarla la marca como hecha (se oscurece con su color; cuenta en Resumen y Constancia) y la × la quita. Nada de ventanas.
 */
export default function Plan({ size, data, update }) {
  const today = todayISO()
  const week = weekDays(today)
  const view = { ...DEFAULT_VIEW, ...(data.planView ?? {}) }
  const sessions = data.planSessions ?? []
  const sports = sportsOf(data)
  const [cfg, setCfg] = useState(false)
  const [editRange, setEditRange] = useState(false) // true mientras se cambia la franja horaria tocando el texto
  const gridRef = useRef(null)
  const [H, setH] = useState(46) // alto de una hora: lo reparte el horario para ocupar todo el alto del widget
  const [dropDay, setDropDay] = useState(null) // columna resaltada mientras arrastras un deporte
  const [newSport, setNewSport] = useState(null) // null | texto del deporte que estás escribiendo
  const [newIcon, setNewIcon] = useState(null) // icono elegido para el deporte nuevo (null = el que se adivina por el nombre)
  const [iconPick, setIconPick] = useState(false) // selector de iconos abierto
  const [durFor, setDurFor] = useState(null) // deporte cuyo tiempo habitual se está ajustando
  const [live, setLive] = useState(null) // { id, start?, min? } mientras tiras de una sesión
  const [pin, setPin] = useState(null) // tarjeta que se queda un momento tras un toque (en el móvil no hay «pasar por encima»)
  const tipTimer = useRef(0)
  const showTip = (id) => { clearTimeout(tipTimer.current); setTip(id) }
  const hideTip = () => { clearTimeout(tipTimer.current); tipTimer.current = setTimeout(() => setTip(null), 120) } // un respiro para poder pasar del bloque a la tarjeta
  const [tip, setTip] = useState(null) // id de la sesión sobre la que está el puntero o el dedo (para la tarjeta con su hora)
  const [guide, setGuide] = useState(null) // { from, to, c }: tramo que se ilumina mientras estiras una sesión
  const shownDays = view.days.slice().sort((a, b) => a - b)
  const total = Math.max(1, view.to - view.from)
  const lo = view.from * 60
  const hi = view.to * 60
  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return undefined
    const fit = () => setH(Math.max(MIN_H, el.clientHeight / total))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [total])

  const saveView = (patch) => update((d) => ({ ...d, planView: { ...DEFAULT_VIEW, ...(d.planView ?? {}), ...patch } }))
  const addSport = (name, icon) => {
    const n = name.trim()
    if (n) update((d) => ({ ...d, sports: sportsOf(d).includes(n) ? sportsOf(d) : [...sportsOf(d), n], sportIcons: sportsOf(d).includes(n) ? (d.sportIcons ?? {}) : { ...(d.sportIcons ?? {}), [n]: icon ?? guessIcon(n) } }))
    setNewSport(null); setNewIcon(null); setIconPick(false)
  }
  const setSportIcon = (sport, icon) => update((d) => ({ ...d, sportIcons: { ...(d.sportIcons ?? {}), [sport]: icon } }))
  const removeSport = (name) => update((d) => ({ ...d, sports: sportsOf(d).filter((x) => x !== name) }))
  // Poner una sesión directamente (solo lleva el deporte, el día, la hora y cuánto dura)
  const usual = (sport) => data.sportMin?.[sport] ?? DEFAULT_MIN // lo que sueles hacer de ese deporte
  const setUsual = (sport, min) => update((d) => ({ ...d, sportMin: { ...(d.sportMin ?? {}), [sport]: Math.min(Math.max(min, MIN_SESSION), 600) } }))
  // Tramos ya ocupados de un día (las sesiones no se pueden solapar)
  const busy = (day, ignoreId) => sessions.filter((x) => x.day === day && x.id !== ignoreId).map((x) => [toMin(x.start), toMin(x.start) + x.min]).sort((a, b) => a[0] - b[0])
  const place = (sport, day, startMin, min = usual(sport)) => {
    const others = busy(day)
    const drop = Math.min(Math.max(snap(startMin), lo), hi - MIN_SESSION)
    let start = drop
    for (const [a, b] of others) if (start >= a && start < b) start = b // cae encima de otra: empieza donde acaba esa
    const next = others.find(([a]) => a >= start)
    let len = Math.min(min, hi - start, next ? next[0] - start : Infinity)
    if (len < MIN_SESSION) { // no hay hueco detrás: se intenta justo antes del punto donde la soltaste
      const prevEnd = Math.max(lo, ...others.filter(([, b]) => b <= drop).map(([, b]) => b))
      start = Math.max(prevEnd, drop - min)
      len = drop - start
      if (len < MIN_SESSION) return // no cabe en ese hueco
    }
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

  // Tirar de una sesión: bordes = duración · centro = moverla libremente (un toque sin mover la marca como hecha)
  const pull = (e, s, mode) => {
    e.preventDefault(); e.stopPropagation()
    const grid = e.currentTarget.closest('.sa-plan-grid')
    const scale = grid.getBoundingClientRect().height / grid.offsetHeight || 1
    const s0 = toMin(s.start)
    const m0 = s.min
    const y0 = e.clientY
    const x0 = e.clientX
    const others = busy(s.day, s.id)
    const prevEnd = Math.max(lo, ...others.filter(([, b]) => b <= s0).map(([, b]) => b)) // no se pasa de la sesión de antes…
    const nextStart = Math.min(hi, ...others.filter(([a]) => a >= s0 + m0).map(([a]) => a)) // …ni de la de después
    let patch = {}
    let moved = false
    const show = (from, len) => { setLive({ id: s.id, ...patch }); setGuide({ from, to: from + len, c: colorOf(sports, s.sport) }) }
    const move = (ev) => {
      const dm = ((ev.clientY - y0) / scale / H) * 60
      if (mode === 'bottom') { patch = { min: Math.min(Math.max(snap(m0 + dm), MIN_SESSION), nextStart - s0) }; show(s0, patch.min) }
      else if (mode === 'top') { const ns = Math.min(Math.max(snap(s0 + dm), prevEnd), s0 + m0 - MIN_SESSION); patch = { start: fromMin(ns), min: s0 + m0 - ns }; show(ns, patch.min) }
      else {
        if (!moved && Math.abs(ev.clientY - y0) < 4 && Math.abs(ev.clientX - x0) < 4) return // todavía es un toque
        moved = true
        const ns = Math.min(Math.max(snap(s0 + dm), lo), hi - m0)
        const col = document.elementsFromPoint(ev.clientX, ev.clientY).find((n) => n.classList?.contains('sa-plan-col'))
        const day = col ? Number(col.dataset.day) : (patch.day ?? s.day)
        if (busy(day, s.id).some(([a, b]) => ns < b && ns + m0 > a)) return // ahí ya hay otra sesión: se queda donde estaba
        patch = { start: fromMin(ns), day }
        show(ns, m0)
      }
    }
    const end = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end)
      setLive(null); setGuide(null)
      if (mode === 'body' && !moved) { toggleDone(s, week[s.day]); setPin(s.id); setTimeout(() => setPin((p) => (p === s.id ? null : p)), 2500); return }
      if (Object.keys(patch).length) commit(s, patch)
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
  }

  // Marcar solas las sesiones cuando pasa su hora (sin tocar las que tú ya has marcado o desmarcado a mano)
  const upd = useRef(update)
  upd.current = update
  const sref = useRef(sessions)
  sref.current = sessions
  useEffect(() => {
    const run = () => {
      const now = new Date()
      const day = now.toLocaleDateString('en-CA')
      const mins = now.getHours() * 60 + now.getMinutes()
      const wk = weekDays(day)
      const isDue = (x) => { const date = wk[x.day]; return date && x.done?.[date] === undefined && (date < day || (date === day && mins >= toMin(x.start) + x.min)) }
      if (!sref.current.some(isDue)) return // nada que marcar: no se guarda nada
      upd.current((d) => {
        const due = (d.planSessions ?? []).filter(isDue)
        if (!due.length) return d
        const entries = due.filter((x) => !(d.workouts ?? []).some((w) => w.planId === x.id && w.date === wk[x.day])).map((x) => ({ id: crypto.randomUUID(), planId: x.id, date: wk[x.day], sport: x.sport, min: x.min, notes: '' }))
        return {
          ...d,
          planSessions: d.planSessions.map((x) => (isDue(x) ? { ...x, done: { ...(x.done ?? {}), [wk[x.day]]: true } } : x)),
          workouts: [...(d.workouts ?? []), ...entries],
        }
      })
    }
    run()
    const id = setInterval(run, 60000)
    return () => clearInterval(id)
  }, [sessions])

  const shown = sessions.map((s) => (live?.id === s.id ? { ...s, ...live } : s))

  if (size === 'M') return <PlanToday data={data} view={view} sessions={sessions} sports={sports} today={today} />

  return (
    <div className="sa-plan">
      <div className="sa-row sa-split">
        {editRange ? (
          <span className="sa-range is-edit">
            <Select value={view.from} label="Primera hora" onChange={(v) => saveView({ from: v })} options={Array.from({ length: view.to }, (_, h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))} />
            <span aria-hidden="true">–</span>
            <Select value={view.to} label="Última hora" onChange={(v) => saveView({ to: v })} options={Array.from({ length: 24 - view.from }, (_, k) => view.from + 1 + k).map((h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))} />
            <button type="button" className="sa-range-ok" onClick={() => setEditRange(false)} aria-label="Listo" title="Listo"><Icon name="check" size={16} strokeWidth={3} color="#FFFFFF" /></button>
          </span>
        ) : (
          <button type="button" className="sa-range" onClick={() => setEditRange(true)} aria-label="Cambiar la franja horaria" title="Cambiar la franja horaria">{fromMin(lo)} – {fromMin(hi)}</button>
        )}
        <button className="sa-btn is-soft sa-cfg" onClick={() => setCfg(true)} aria-label="Horas y días que se ven" title="Horas y días"><svg width="28" height="28" viewBox="0 0 24 24" fill="#202124" aria-hidden="true">{/* el icono clásico de ajustes: dos barras con su deslizador cuadrado */}
          <rect x="2" y="5.6" width="10.5" height="2.8" rx="1.4" /><rect x="13.8" y="3.8" width="5.6" height="6.4" rx="1.6" /><rect x="20.7" y="5.6" width="1.6" height="2.8" rx=".8" />
          <rect x="1.7" y="15.6" width="1.6" height="2.8" rx=".8" /><rect x="4.6" y="13.8" width="5.6" height="6.4" rx="1.6" /><rect x="11.5" y="15.6" width="10.5" height="2.8" rx="1.4" />
        </svg></button>
      </div>
      <div className="sa-sportbar" aria-label="Deportes: arrástralos al plan">
        {sports.map((sp) => (
          <span key={sp} className="sa-bubble" style={{ '--c': colorOf(sports, sp) }}>
            <button type="button" draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', sp); setDurFor(null) }} onClick={() => setDurFor(durFor === sp ? null : sp)} aria-expanded={durFor === sp} title="Arrástralo al plan · pulsa para fijar cuánto sueles hacer"><SportIcon name={iconOf(data, sp)} size={15} />{sp}</button>
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
                  <span className="sa-ico-grid" role="radiogroup" aria-label={`Icono de ${sp}`}>
                    {ICON_KEYS.map((k) => <button type="button" key={k} role="radio" aria-checked={iconOf(data, sp) === k} aria-label={k} className={iconOf(data, sp) === k ? 'on' : ''} onClick={() => setSportIcon(sp, k)}><SportIcon name={k} size={18} /></button>)}
                  </span>
                  <button type="button" className="sa-btn" onClick={() => quickAdd(sp)}>Poner hoy</button>
                </span>
              </>
            )}
          </span>
        ))}
        {newSport === null
          ? <button type="button" className="sa-bubble-add" onClick={() => setNewSport('')}><Icon name="plus" size={13} strokeWidth={2.8} /> Deporte</button>
          : (
            <span className="sa-newsport" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) addSport(newSport, newIcon) }}>
              <button type="button" className="sa-ico-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => setIconPick(!iconPick)} aria-label="Elegir icono del deporte" aria-expanded={iconPick} title="Elegir icono"><SportIcon name={newIcon ?? guessIcon(newSport)} size={18} /></button>
              <input className="sa-bubble-in" autoFocus value={newSport} maxLength={30} placeholder="Deporte" aria-label="Nuevo deporte" onChange={(e) => setNewSport(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSport(newSport, newIcon); if (e.key === 'Escape') { setNewSport(null); setNewIcon(null); setIconPick(false) } }} />
              {iconPick && (
                <span className="card sa-ico-pop sa-ico-grid" role="radiogroup" aria-label="Icono del deporte">
                  {ICON_KEYS.map((k) => { const on = (newIcon ?? guessIcon(newSport)) === k; return <button type="button" key={k} role="radio" aria-checked={on} aria-label={k} className={on ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => { setNewIcon(k); setIconPick(false) }}><SportIcon name={k} size={20} /></button> })}
                </span>
              )}
            </span>
          )}
      </div>
      <div className="sa-plan-days" style={{ '--c': shownDays.length }}>
        <span />{shownDays.map((i) => <b key={i} className={`${week[i] === today ? 'is-today' : ''} ${week[i] < today ? 'is-past' : ''}`}>{dayShort(week[i])} {Number(week[i].slice(8))}</b>)}
      </div>
      <div className="sa-plan-grid" ref={gridRef} style={{ '--c': shownDays.length, '--minh': `${total * MIN_H}px` }}>
        <div className="sa-plan-hours">{Array.from({ length: total + 1 }, (_, k) => <span key={k} style={{ top: k * H }}>{view.from + k}:00</span>)}</div>
        {guide && (
          <>
            {[guide.from, guide.to].map((m, k) => (
              <span key={k} className="sa-thread" style={{ top: ((m - lo) / 60) * H, '--c': guide.c }}>
                <em>{fromMin(m)}</em>
              </span>
            ))}
          </>
        )}
        {shownDays.map((i) => {
          const date = week[i]
          return (
            <div key={i} data-day={i} className={`sa-plan-col ${date === today ? 'is-today' : ''} ${date < today ? 'is-past' : ''} ${dropDay === i ? 'is-drop' : ''}`} role="presentation"
              onDragOver={(e) => { e.preventDefault(); if (dropDay !== i) setDropDay(i) }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropDay(null) }} onDrop={(e) => onDropSport(e, i)}>
              {Array.from({ length: total }, (_, k) => <i key={k} style={{ top: k * H }} />)}
              {shown.filter((s) => s.day === i).map((s) => {
                const top = ((toMin(s.start) - lo) / 60) * H
                const height = (s.min / 60) * H
                if (top + height <= 0 || top >= total * H) return null
                const done = Boolean(s.done?.[date])
                const h = height - 2
                const short = h < 40 // 1 h o menos cuando el horario va apretado: letra a la medida y una sola línea
                const iconMode = short && s.min < 60 // menos de 1 h: en vez del nombre, el icono del deporte estampado a lo largo de la barra (se ve siempre, aunque sean 15 min)
                const tiny = iconMode && h < 20 // sin sitio para la × dentro: se quita desde la tarjeta al pasar o pulsar
                const stamp = iconMode ? { backgroundImage: stampOf(iconOf(data, s.sport)), backgroundSize: `${(Math.max(h, 10) * 36) / 32}px ${Math.max(h, 10)}px`, backgroundRepeat: 'round no-repeat', backgroundPosition: '0 center', backgroundOrigin: 'border-box', backgroundClip: 'border-box' } : null
                const end = fromMin(toMin(s.start) + s.min)
                return (
                  <Fragment key={s.id}>
                  <div className={`sa-sess ${done ? 'is-done' : ''} ${live?.id === s.id ? 'is-live' : ''} ${short ? 'is-short' : ''} ${tiny ? 'is-tiny' : ''}`} style={{ ...stamp, top: top + 1, height: h, '--c': colorOf(sports, s.sport), '--x': `${Math.max(10, Math.min(18, h - 4))}px` }}
                    onPointerEnter={() => showTip(s.id)} onPointerLeave={hideTip} onFocus={() => showTip(s.id)} onBlur={hideTip}
                    role="button" tabIndex={0} aria-label={`${s.sport}, ${s.start} a ${fromMin(toMin(s.start) + s.min)}. Toca para marcarla como hecha`} title="Toca: hecha · arrastra: mover · tira de los bordes: duración"
                    onPointerDown={(e) => pull(e, s, 'body')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDone(s, date) } }}>
                    <span className="sa-rz sa-rz-t" onPointerDown={(e) => pull(e, s, 'top')} onClick={(e) => e.stopPropagation()} aria-hidden="true" />
                                        {!iconMode && <SessName text={s.sport} max={short ? Math.max(6, Math.min(14, Math.floor((h - 6) / 1.1))) : 15} single={short} />}
                    <button type="button" className="sa-sess-x" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); remove(s.id) }} aria-label={`Quitar ${s.sport}`} title="Quitar"><Icon name="close" size={11} strokeWidth={3} /></button>
                    <span className="sa-rz sa-rz-b" onPointerDown={(e) => pull(e, s, 'bottom')} onClick={(e) => e.stopPropagation()} aria-hidden="true" />
                  </div>
                  {short && (tip === s.id || pin === s.id || live?.id === s.id) && (
                    <span className={`sa-tip ${top < 44 ? 'is-below' : ''}`} style={{ top: top < 44 ? top + h : top, '--c': colorOf(sports, s.sport) }} onPointerEnter={() => showTip(s.id)} onPointerLeave={hideTip}>
                      <span className="sa-tip-in">
                        <span className="sa-tip-txt"><b><SportIcon name={iconOf(data, s.sport)} size={14} /> {s.sport}</b><span>{fromMin(toMin(s.start))} – {end} · {fmtHM(s.min)}</span></span>
                        {tiny && <button type="button" className="sa-tip-x" onClick={() => remove(s.id)} aria-label={`Quitar ${s.sport}`} title="Quitar"><Icon name="close" size={12} strokeWidth={3} /></button>}
                      </span>
                    </span>
                  )}
                  </Fragment>
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
