import { locale } from '../../i18n/index.js'
import { useEffect, useRef, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import History from '../../components/History.jsx'
import Icon from '../../components/Icon.jsx'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { addDays, dayShort, formatShort, todayISO, weekStart } from '../../lib/dates.js'
import Modal from '../food/Modal.jsx'
import { projectsOf } from '../../widgets/trabajo/projects.js'
import { PROJECT_COLORS, colorOf, soft, toHHMM, toMin } from './shared.js'
import { useShared } from './SharedCtx.js'

const H = 44 // px por hora
const SNAP = 15 // minutos: las reuniones se ajustan de 15 en 15
const MIN_LEN = 15
const DEFAULT_LEN = 60
const DEFAULT_VIEW = { from: 8, to: 20, days: [0, 1, 2, 3, 4, 5, 6] }
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const snap = (m) => Math.round(m / SNAP) * SNAP
const MEETING = '#3185FC'

/**
 * Agenda: funciona como el plan de ejercicio de Salud.
 *  - Los globitos (Reunión y cada proyecto) se arrastran a un día y una hora, o se tocan para ponerlos hoy.
 *  - Tira del borde de arriba o de abajo para cambiar la duración; agárrala por el centro para moverla a otro día u hora (sin solaparse).
 *  - Toca una reunión para ponerle nombre o cambiarla; la × la quita. Lo que ya pasó va al reloj (historial).
 */
export default function AgendaBlock({ data, update, projectId = null }) {
  const today = todayISO()
  const narrow = useMediaQuery('(max-width: 899px)')
  const [anchor, setAnchor] = useState(today)
  const [draft, setDraft] = useState(null) // reunión que se está nombrando o cambiando
  const [now, setNow] = useState(() => new Date())
  const [cfg, setCfg] = useState(false)
  const sh = useShared()
  const [who, setWho] = useState('all') // todo · mis cosas · las del resto
  const [newTag, setNewTag] = useState(null)
  const [dropDate, setDropDate] = useState(null)
  const [live, setLive] = useState(null) // { id, ...cambios } mientras tiras de una reunión
  const [guide, setGuide] = useState(null) // { from, to, c }: líneas de hora mientras la estiras
  const formRef = useRef(null)
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id) }, [])

  const view = { ...DEFAULT_VIEW, ...(data.agendaView ?? {}) }
  const lo = view.from * 60
  const hi = view.to * 60
  const total = Math.max(1, view.to - view.from)
  const projects = projectsOf(data)
  const me = sh.me
  const hasShared = projectId ? Boolean(projects.find((p) => p.id === projectId)?.shared) : projects.some((p) => p.shared)
  // Las reuniones de un proyecto compartido viven en el proyecto (así las ven todos); el resto, en tus datos
  const everything = [...(data.meetings ?? []), ...projects.filter((p) => p.shared).flatMap((p) => (p.meetings ?? []).map((e) => ({ ...e, projectId: p.id, _shared: true })))]
  const mineOf = (e) => !e.by || e.by === me
  const events = everything.filter((e) => (!projectId || e.projectId === projectId) && (who === 'all' || (who === 'mine' ? mineOf(e) : !mineOf(e))))
  const project = projectId ? projects.find((p) => p.id === projectId) : null
  const tagsOf = (pid) => (pid ? projects.find((p) => p.id === pid)?.tags : data.agendaTags) ?? []
  const milestones = projects.filter((p) => !projectId || p.id === projectId).flatMap((p) => (p.milestones ?? []).map((m) => ({ ...m, projectId: p.id, c: colorOf(data, p.id) })))
  const wk = Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i))
  const shownIdx = view.days.slice().sort((a, b) => a - b)
  const days = narrow ? [anchor] : shownIdx.map((i) => wk[i])
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const thisWeek = weekStart(anchor) === weekStart(today)
  const colorFor = (ev) => (ev.kind !== 'meeting' && ev.projectId && ev.by && sh.color(ev.projectId, ev.by)) || (ev.projectId ? colorOf(data, ev.projectId) : ev.color ?? MEETING)
  const tagColor = (pid, id) => tagsOf(pid).find((t) => t.id === id)?.color ?? '#9AA0A6'
  const bubbles = projectId
    ? [{ key: 'meeting', label: 'Reunión', projectId, c: colorOf(data, projectId) }, ...tagsOf(projectId).map((t) => ({ key: `tag:${t.id}`, label: t.name, projectId, c: t.color, tag: t.id }))]
    : [{ key: 'meeting', label: 'Reunión', projectId: null, c: MEETING }, ...projects.map((p) => ({ key: p.id, label: p.name, projectId: p.id, c: colorOf(data, p.id) }))]

  // Tocar fuera del formulario lo cierra (como en el resto de la app)
  useEffect(() => {
    if (!draft) return undefined
    const away = (e) => { if (!formRef.current?.contains(e.target) && !e.target.closest?.('.sa-sess')) setDraft(null) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [draft])

  const saveView = (patch) => update((d) => ({ ...d, agendaView: { ...DEFAULT_VIEW, ...(d.agendaView ?? {}), ...patch } }))
  const busy = (date, ignoreId) => everything.filter((x) => x.date === date && x.id !== ignoreId).map((x) => [toMin(x.start), toMin(x.end)]).sort((a, b) => a[0] - b[0])

  // Poner una reunión (se ajusta para no pisar otras)
  const place = (b, date, startMin, len = DEFAULT_LEN) => {
    const others = busy(date)
    const drop = Math.min(Math.max(snap(startMin), lo), hi - MIN_LEN)
    let start = drop
    for (const [a, z] of others) if (start >= a && start < z) start = z
    const next = others.find(([a]) => a >= start)
    let l = Math.min(len, hi - start, next ? next[0] - start : Infinity)
    if (l < MIN_LEN) {
      const prevEnd = Math.max(lo, ...others.filter(([, z]) => z <= drop).map(([, z]) => z))
      start = Math.max(prevEnd, drop - len)
      l = drop - start
      if (l < MIN_LEN) return
    }
    const ev = { id: crypto.randomUUID(), date, start: toHHMM(start), end: toHHMM(start + l), title: b.projectId && !b.tag && !projectId ? b.label : b.tag ? b.label : 'Reunión', projectId: b.projectId, color: b.projectId ? undefined : b.c, ...(b.tag ? { tags: [b.tag] } : {}) }
    addEvent(ev)
  }
  const onDropBubble = (e, date) => {
    e.preventDefault(); setDropDate(null)
    const b = bubbles.find((x) => x.key === e.dataTransfer.getData('text/plain'))
    if (!b) return
    const r = e.currentTarget.getBoundingClientRect()
    const z = parseFloat(getComputedStyle(e.currentTarget.closest('.d-app') ?? document.body).zoom) || 1 // la vista de escritorio va con zoom
    place(b, date, lo + (((e.clientY - r.top) / z) / H) * 60)
  }
  const quickAdd = (b) => {
    const d = days.includes(today) ? today : days[0]
    const start = d === today ? Math.min(Math.max(Math.ceil(nowMin / 60) * 60, lo), hi - DEFAULT_LEN) : lo
    place(b, d, start)
  }
  // Dónde se guarda cada reunión: en el proyecto si es compartido, en tus datos si no
  const addEvent = (ev) => update((d) => {
    const proj = ev.projectId ? (d.projects ?? []).find((p) => p.id === ev.projectId) : null
    const full = proj?.shared ? { ...ev, by: me } : ev
    if (proj?.shared) return { ...d, projects: d.projects.map((p) => (p.id === proj.id ? { ...p, meetings: [...(p.meetings ?? []), full] } : p)) }
    return { ...d, meetings: [...(d.meetings ?? []), full] }
  })
  const mutate = (id, fn) => update((d) => {
    const inShared = (d.projects ?? []).some((p) => p.shared && (p.meetings ?? []).some((e) => e.id === id))
    const apply = (list) => (list ?? []).flatMap((e) => (e.id === id ? [fn(e)].filter(Boolean) : [e]))
    if (inShared) return { ...d, projects: d.projects.map((p) => (p.shared && (p.meetings ?? []).some((e) => e.id === id) ? { ...p, meetings: apply(p.meetings) } : p)) }
    return { ...d, meetings: apply(d.meetings) }
  })
  const remove = (id) => { mutate(id, () => null); setDraft(null) }
  const commit = (id, patch) => mutate(id, (e) => ({ ...e, ...patch }))
  const addTag = (pid, name) => {
    const n = name.trim()
    if (!n) return null
    const tag = { id: crypto.randomUUID(), name: n.slice(0, 24), color: PROJECT_COLORS[tagsOf(pid).length % PROJECT_COLORS.length] }
    update((d) => (pid ? { ...d, projects: d.projects.map((p) => (p.id === pid ? { ...p, tags: [...(p.tags ?? []), tag] } : p)) } : { ...d, agendaTags: [...(d.agendaTags ?? []), tag] }))
    return tag
  }
  const removeTag = (pid, id) => update((d) => (pid ? { ...d, projects: d.projects.map((p) => (p.id === pid ? { ...p, tags: (p.tags ?? []).filter((t) => t.id !== id) } : p)) } : { ...d, agendaTags: (d.agendaTags ?? []).filter((t) => t.id !== id) }))
  const saveDraft = (ev) => {
    if (!ev.title.trim() || toMin(ev.end) <= toMin(ev.start)) return
    if (busy(ev.date, ev.id).some(([a, z]) => toMin(ev.start) < z && toMin(ev.end) > a)) return
    commit(ev.id, { title: ev.title.trim(), start: ev.start, end: ev.end, projectId: ev.projectId, color: ev.color, tags: ev.tags ?? [], note: ev.note ?? '' })
    setDraft(null)
  }

  // Tirar de una reunión: bordes = duración · centro = moverla (un toque sin mover la abre)
  const pull = (e, ev, mode) => {
    e.preventDefault(); e.stopPropagation()
    const grid = e.currentTarget.closest('.sa-plan-grid')
    const scale = grid.getBoundingClientRect().height / grid.offsetHeight || 1
    const s0 = toMin(ev.start)
    const m0 = toMin(ev.end) - s0
    const y0 = e.clientY
    const x0 = e.clientX
    const others = busy(ev.date, ev.id)
    const prevEnd = Math.max(lo, ...others.filter(([, z]) => z <= s0).map(([, z]) => z))
    const nextStart = Math.min(hi, ...others.filter(([a]) => a >= s0 + m0).map(([a]) => a))
    let patch = {}
    let moved = false
    const show = (from, len) => { setLive({ id: ev.id, ...patch }); setGuide({ from, to: from + len, c: colorFor(ev) }) }
    const move = (p) => {
      const dm = ((p.clientY - y0) / scale / H) * 60
      if (mode === 'bottom') { const l = Math.min(Math.max(snap(m0 + dm), MIN_LEN), nextStart - s0); patch = { end: toHHMM(s0 + l) }; show(s0, l) }
      else if (mode === 'top') { const ns = Math.min(Math.max(snap(s0 + dm), prevEnd), s0 + m0 - MIN_LEN); patch = { start: toHHMM(ns) }; show(ns, s0 + m0 - ns) }
      else {
        if (!moved && Math.abs(p.clientY - y0) < 4 && Math.abs(p.clientX - x0) < 4) return
        moved = true
        const ns = Math.min(Math.max(snap(s0 + dm), lo), hi - m0)
        const col = document.elementsFromPoint(p.clientX, p.clientY).find((n) => n.classList?.contains('sa-plan-col'))
        const date = col ? col.dataset.date : (patch.date ?? ev.date)
        if (busy(date, ev.id).some(([a, z]) => ns < z && ns + m0 > a)) return
        patch = { start: toHHMM(ns), end: toHHMM(ns + m0), date }
        show(ns, m0)
      }
    }
    const end = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end)
      setLive(null); setGuide(null)
      if (mode === 'body' && !moved) { setDraft({ ...ev }); return }
      if (Object.keys(patch).length) commit(ev.id, patch)
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
  }

  const shown = events.map((x) => (live?.id === x.id ? { ...x, ...live } : x))
  const past = events.filter((x) => x.date < today).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)).slice(0, 80)
  const step = narrow ? 1 : 7
  const range = `${new Date(`${days[0]}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}${days.length > 1 ? ` – ${new Date(`${days.at(-1)}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}` : ''}`

  return (
    <div className="sa-plan wk-agenda-plan">
      <div className="sa-row sa-split">
        <span className="agenda-nav">
          <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, -step))} disabled={narrow ? anchor <= today : thisWeek} aria-label="Anterior"><Icon name="left" size={18} /></button>
          <button className="pill pill-sm" onClick={() => setAnchor(today)} disabled={days.includes(today)}>Hoy</button>
          <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, step))} aria-label="Siguiente"><Icon name="right" size={18} /></button>
          <span className="muted agenda-range">{range}</span>
        </span>
        <span className="agenda-tools">
          {hasShared && (
            <span className="ag-who" role="group" aria-label="Qué reuniones ver">
              {[['all', 'Todo'], ['mine', 'Mías'], ['others', 'Del resto']].map(([k, l]) => <button key={k} type="button" className={who === k ? 'on' : ''} aria-pressed={who === k} onClick={() => setWho(k)}>{l}</button>)}
            </span>
          )}
          <History title="Reuniones pasadas" items={past.map((x) => ({ id: x.id, date: formatShort(x.date), text: `${x.title} · ${x.start}–${x.end}` }))} empty="Todavía no hay reuniones pasadas" />
          <button className="sa-btn is-soft" onClick={() => setCfg(true)} aria-label="Horas y días que se ven" title="Horas y días"><Icon name="sliders" size={15} /></button>
        </span>
      </div>
      <div className="sa-sportbar" aria-label="Arrastra al calendario">
        {bubbles.map((b) => (
          <span key={b.key} className="sa-bubble" style={{ '--c': b.c }}>
            <button type="button" draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', b.key) }} onClick={() => quickAdd(b)} title="Arrástrala al calendario, o tócala para ponerla hoy">{b.label}</button>
          </span>
        ))}
      </div>
      <div className="sa-plan-days" style={{ '--c': days.length }}>
        <span />{days.map((d) => <b key={d} className={`${d === today ? 'is-today' : ''} ${d < today ? 'is-past' : ''}`}>{dayShort(d)} {Number(d.slice(8))}</b>)}
      </div>
      {days.some((d) => milestones.some((m) => m.date === d)) && (
        <div className="sa-plan-days ag-ms-row" style={{ '--c': days.length }}>
          <span />{days.map((d) => (
            <span key={d} className="ag-ms-cell">
              {milestones.filter((m) => m.date === d).map((m) => <span key={m.id} className={`ag-ms ${m.done ? 'is-done' : ''}`} style={{ '--c': m.c }} title={`${m.title}${m.done ? ' (cumplido)' : ''}`}><i />{m.title}</span>)}
            </span>
          ))}
        </div>
      )}
      <div className="sa-plan-grid" style={{ '--c': days.length, height: total * H }}>
        <div className="sa-plan-hours">{Array.from({ length: total + 1 }, (_, k) => <span key={k} style={{ top: k * H }}>{view.from + k}:00</span>)}</div>
        {guide && [guide.from, guide.to].map((m, k) => <span key={k} className="sa-thread" style={{ top: ((m - lo) / 60) * H, '--c': guide.c }}><em>{toHHMM(m)}</em></span>)}
        {days.map((date) => (
          <div key={date} data-date={date} className={`sa-plan-col ${date === today ? 'is-today' : ''} ${date < today ? 'is-past' : ''} ${dropDate === date ? 'is-drop' : ''}`} role="presentation"
            onDragOver={(e) => { e.preventDefault(); if (dropDate !== date) setDropDate(date) }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropDate(null) }} onDrop={(e) => onDropBubble(e, date)}>
            {Array.from({ length: total }, (_, k) => <i key={k} style={{ top: k * H }} />)}
            {date === today && nowMin >= lo && nowMin <= hi && <span className="agenda-now" style={{ top: ((nowMin - lo) / 60) * H }} />}
            {shown.filter((x) => x.date === date).map((x) => {
              const top = ((toMin(x.start) - lo) / 60) * H
              const height = ((toMin(x.end) - toMin(x.start)) / 60) * H
              if (top + height <= 0 || top >= total * H) return null
              return (
                <div key={x.id} className={`sa-sess ${x.kind === 'meeting' ? 'is-meeting' : ''} ${live?.id === x.id ? 'is-live' : ''}`} style={{ top: top + 1, height: height - 2, '--c': colorFor(x) }}
                  role="button" tabIndex={0} aria-label={`${x.title}, ${x.start} a ${x.end}. Toca para cambiarla`} title="Toca: cambiar · arrastra: mover · tira de los bordes: duración"
                  onPointerDown={(e) => pull(e, x, 'body')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDraft({ ...x }) } }}>
                  <span className="sa-rz sa-rz-t" onPointerDown={(e) => pull(e, x, 'top')} onClick={(e) => e.stopPropagation()} aria-hidden="true" />
                  {x.kind === 'meeting'
                    ? (
                      <span className={`ag-meet ${height <= 58 ? 'is-compact' : ''}`}>
                        <span className="ag-meet-top"><Icon name="amigos" size={14} color="#fff" />{height > 58 && <em>{x.start}–{x.end}</em>}</span>
                        <b>{x.title}</b>
                        {height > 78 && (x.attendees ?? []).length > 0 && (
                          <span className="ag-meet-av">{(x.attendees ?? []).map((u) => { const m = (sh.meta(x.projectId)?.members ?? []).find((y) => y.username === u); return m ? <Avatar key={u} avatar={m.avatar} size={20} /> : null })}</span>
                        )}
                      </span>
                    )
                    : <b className="sa-name">{x.title}</b>}
                  {height > 52 && (x.tags ?? []).length > 0 && <span className="ag-evtags">{(x.tags ?? []).map((id) => <i key={id} style={{ background: tagColor(x.projectId, id) }} title={tagsOf(x.projectId).find((t) => t.id === id)?.name} />)}</span>}
                  <button type="button" className="sa-sess-x" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); remove(x.id) }} aria-label={`Quitar ${x.title}`} title="Quitar"><Icon name="close" size={11} strokeWidth={3} /></button>
                  <span className="sa-rz sa-rz-b" onPointerDown={(e) => pull(e, x, 'bottom')} onClick={(e) => e.stopPropagation()} aria-hidden="true" />
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {draft && (
        <form ref={formRef} className="card agenda-edit" onSubmit={(e) => { e.preventDefault(); saveDraft(draft) }}>
          <input autoFocus placeholder="Reunión con…" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={60} aria-label="Título" />
          <span className="agenda-times">
            <Icon name="clock" size={16} />
            <input type="time" value={draft.start} step={SNAP * 60} onChange={(e) => e.target.value && setDraft({ ...draft, start: e.target.value })} aria-label="Empieza" />
            <span>–</span>
            <input type="time" value={draft.end} step={SNAP * 60} onChange={(e) => e.target.value && setDraft({ ...draft, end: e.target.value })} aria-label="Acaba" />
          </span>
          {!projectId && !draft._shared && (
            <span className="agenda-colors">
              {projects.filter((p) => !p.shared).map((p) => (
                <button type="button" key={p.id} className={`seg-chip ${draft.projectId === p.id ? 'on' : ''}`} style={{ background: soft(colorOf(data, p.id), 35) }} onClick={() => setDraft({ ...draft, projectId: draft.projectId === p.id ? null : p.id })}>{p.name}</button>
              ))}
            </span>
          )}
          <span className="ag-tags" aria-label="Etiquetas">
            {tagsOf(draft.projectId).map((t) => {
              const on = (draft.tags ?? []).includes(t.id)
              return (
                <span key={t.id} className={`ag-tag ${on ? 'on' : ''}`} style={{ '--c': t.color }}>
                  <button type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, tags: on ? draft.tags.filter((x) => x !== t.id) : [...(draft.tags ?? []), t.id] })}>{t.name}</button>
                  <button type="button" className="ag-tag-x" onClick={() => { removeTag(draft.projectId, t.id); setDraft({ ...draft, tags: (draft.tags ?? []).filter((x) => x !== t.id) }) }} aria-label={`Borrar la etiqueta ${t.name}`} title="Borrar etiqueta"><Icon name="close" size={10} strokeWidth={3} /></button>
                </span>
              )
            })}
            {newTag === null
              ? <button type="button" className="ag-tag-add" onClick={() => setNewTag('')}><Icon name="plus" size={12} strokeWidth={2.8} />Etiqueta</button>
              : <input className="ag-tag-in" autoFocus value={newTag} maxLength={24} placeholder="Cuentas, clientes…" aria-label="Nueva etiqueta" onChange={(e) => setNewTag(e.target.value)}
                  onBlur={() => setNewTag(null)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = addTag(draft.projectId, newTag); if (t) setDraft({ ...draft, tags: [...(draft.tags ?? []), t.id] }); setNewTag(null) } if (e.key === 'Escape') setNewTag(null) }} />}
          </span>
          <textarea className="ag-note" rows={2} maxLength={600} value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Nota (opcional)" aria-label="Nota" />
          <span className="agenda-actions">
            <button type="button" className="icon-btn" onClick={() => remove(draft.id)} aria-label="Borrar"><Icon name="trash" size={18} /></button>
            <button type="button" className="icon-btn" onClick={() => setDraft(null)} aria-label="Cerrar"><Icon name="close" size={18} /></button>
            <button className="icon-btn on" disabled={!draft.title.trim() || toMin(draft.end) <= toMin(draft.start)} aria-label="Guardar"><Icon name="check" size={18} /></button>
          </span>
        </form>
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
