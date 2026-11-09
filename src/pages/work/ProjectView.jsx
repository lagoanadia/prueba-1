import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { daysUntil, formatShort, lastDays, todayISO } from '../../lib/dates.js'
import { progressOf } from '../../widgets/trabajo/projects.js'
import QuickNote from '../study/QuickNote.jsx'
import Tools from '../study/Tools.jsx'
import BoardBlock from './BoardBlock.jsx'
import Milestones from './Milestones.jsx'
import { PROJECT_COLORS, colorOf, soft } from './shared.js'

const fmtTime = (min) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`)
const fmtClock = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * Un proyecto por dentro: progreso y plazo, línea de tiempo con hitos, sus tareas,
 * cronómetro de horas dedicadas, notas, enlaces propios y sus reuniones de la agenda.
 */
export default function ProjectView({ data, update, projectId, back }) {
  const today = todayISO()
  const project = (data.projects ?? []).find((p) => p.id === projectId)
  const [tick, setTick] = useState(0)
  useEffect(() => { if (!project?.timerStart) return; const id = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(id) }, [project?.timerStart])
  if (!project) return null

  const change = (fn) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === projectId ? fn(p) : p)) }))
  const c = colorOf(data, projectId)
  const { total, done, pct } = progressOf(project)
  const left = project.deadline ? daysUntil(project.deadline) : null
  const time = project.time ?? {}
  const totalMin = Object.values(time).reduce((a, b) => a + b, 0)
  const meetings = (data.meetings ?? []).filter((m) => m.projectId === projectId && m.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))

  // Cronómetro: se guarda la hora de inicio, así sigue contando aunque cierres la app
  const running = project.timerStart ? Math.floor((Date.now() - project.timerStart) / 1000) : 0
  void tick
  const toggleTimer = () => change((p) => {
    if (!p.timerStart) return { ...p, timerStart: Date.now() }
    const min = Math.max(1, Math.round((Date.now() - p.timerStart) / 60000))
    return { ...p, timerStart: null, time: { ...(p.time ?? {}), [today]: ((p.time ?? {})[today] ?? 0) + min } }
  })
  const week = lastDays(7, today)
  const maxDay = Math.max(30, ...week.map((d) => time[d] ?? 0))

  // Enlaces del proyecto: reutiliza la cuadrícula de herramientas sobre project.links
  const linksData = { tools: project.links ?? [] }
  const linksUpdate = (fn) => change((p) => ({ ...p, links: fn({ tools: p.links ?? [] }).tools }))
  const note = project.note ?? { html: '' }

  return (
    <div className="page work project-view" style={{ '--c': c }}>
      <button className="back-link" onClick={back}><Icon name="back" size={18} /> Trabajo</button>

      <div className="plan-grid wk-grid">
        <section className="card plan-block wk-block span-3 pv-head">
          <div className="pv-ring" style={{ '--p': pct, '--c': c }} aria-label={`${pct}% hecho`}><b>{pct}%</b></div>
          <div className="pv-title">
            <input className="pv-name" defaultValue={project.name} maxLength={50} onBlur={(e) => e.target.value.trim() && change((p) => ({ ...p, name: e.target.value.trim() }))} aria-label="Nombre del proyecto" />
            <span className="pv-colors">
              {PROJECT_COLORS.map((col) => <button key={col} className={`agenda-swatch ${col === c ? 'on' : ''}`} style={{ background: col }} onClick={() => change((p) => ({ ...p, color: col }))} aria-label="Color del proyecto" />)}
            </span>
          </div>
          <div className="pv-stats">
            <label className={`pv-stat ${left != null && left < 0 && pct < 100 ? 'is-late' : ''}`} title="Fecha límite">
              <Icon name="calendario" size={18} /><b>{project.deadline ? (left < 0 ? `${-left} d tarde` : left === 0 ? 'Hoy' : `${left} d`) : '—'}</b>
              <span className="muted">{project.deadline ? formatShort(project.deadline) : 'Sin plazo'}</span>
              <input type="date" value={project.deadline ?? ''} onChange={(e) => change((p) => ({ ...p, deadline: e.target.value || null }))} aria-label="Fecha límite" />
            </label>
            <span className="pv-stat" title="Tareas"><Icon name="check" size={18} /><b>{done}/{total}</b><span className="muted">tareas</span></span>
            <span className="pv-stat" title="Tiempo dedicado"><Icon name="clock" size={18} /><b>{fmtTime(totalMin)}</b><span className="muted">dedicadas</span></span>
            <span className="pv-stat" title="Reuniones próximas"><Icon name="calendario" size={18} /><b>{meetings.length}</b><span className="muted">reuniones</span></span>
          </div>
        </section>

        <section className="card plan-block wk-block span-3 pv-ms-block" aria-label="Hitos">
          <Milestones project={project} change={change} color={c} />
        </section>

        <section className="card plan-block wk-block wk-board span-2" aria-label="Tareas">
          <span className="wk-badge" title="Tareas"><Icon name="board" size={18} /></span>
          <BoardBlock data={data} update={update} onlyProject={projectId} />
        </section>

        <section className="card plan-block wk-block span-1 pv-time" aria-label="Tiempo">
          <span className="wk-badge" title="Tiempo"><Icon name="clock" size={18} /></span>
          <button className={`pv-timer ${project.timerStart ? 'is-running' : ''}`} onClick={toggleTimer} style={{ '--c': c }} aria-label={project.timerStart ? 'Parar cronómetro' : 'Empezar cronómetro'}>
            <span className="pv-clock">{fmtClock(running)}</span>
            <span className="muted">{project.timerStart ? 'parar' : 'empezar'}</span>
          </button>
          <div className="pv-week" aria-label="Últimos 7 días">
            {week.map((d) => (
              <span key={d} className={d === today ? 'is-today' : ''} title={`${formatShort(d)}: ${fmtTime(time[d] ?? 0)}`}>
                <span className="pv-bar" style={{ height: `${((time[d] ?? 0) / maxDay) * 100}%`, background: soft(c, d === today ? 100 : 55) }} />
                <i>{formatShort(d)[0].toUpperCase()}</i>
              </span>
            ))}
          </div>
          <span className="muted pv-sum">{fmtTime(week.reduce((a, d) => a + (time[d] ?? 0), 0))} esta semana</span>
        </section>

        <section className="plan-block is-note span-1" aria-label="Notas">
          <QuickNote note={{ color: c, ...note }} onChange={(n) => change((p) => ({ ...p, note: n }))} onDelete={() => change((p) => ({ ...p, note: { html: '' } }))} />
        </section>

        <section className="card plan-block wk-block wk-tools span-1" aria-label="Enlaces">
          <span className="wk-badge" title="Enlaces del proyecto"><Icon name="link" size={18} /></span>
          <Tools data={linksData} update={linksUpdate} bare />
        </section>

        <section className="card plan-block wk-block span-1 pv-meetings" aria-label="Reuniones">
          <span className="wk-badge" title="Próximas reuniones"><Icon name="calendario" size={18} /></span>
          <ul>
            {meetings.map((m) => (
              <li key={m.id} style={{ borderColor: c }}>
                <b>{m.title}</b>
                <span className="muted">{m.date === today ? 'Hoy' : formatShort(m.date)} · {m.start}–{m.end}</span>
              </li>
            ))}
            {meetings.length === 0 && <li className="muted pv-empty">Apúntalas en la agenda con el color del proyecto</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
