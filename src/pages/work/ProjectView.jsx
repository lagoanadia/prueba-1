import { useEffect, useState } from 'react'
import BlockEdit from '../../components/BlockEdit.jsx'
import useBlockDrag from '../../hooks/useBlockDrag.js'
import useExitEdit from '../../hooks/useExitEdit.js'
import Icon from '../../components/Icon.jsx'
import TopActions from '../../components/TopActions.jsx'
import { daysUntil, formatShort, lastDays, todayISO } from '../../lib/dates.js'
import { progressOf } from '../../widgets/trabajo/projects.js'
import QuickNote from '../study/QuickNote.jsx'
import Tools from '../study/Tools.jsx'
import BoardBlock from './BoardBlock.jsx'
import Milestones from './Milestones.jsx'
import DocsBlock from './DocsBlock.jsx'
import DocView from './DocView.jsx'
import SharedBar from './SharedBar.jsx'
import AgendaBlock from './AgendaBlock.jsx'
import { PROJECT_COLORS, colorOf, soft } from './shared.js'

const DEFAULT_BLOCKS = [
  { id: 'head', type: 'head', span: 3 }, { id: 'milestones', type: 'milestones', span: 3 }, { id: 'docs', type: 'docs', span: 3 },
  { id: 'board', type: 'board', span: 2 }, { id: 'time', type: 'time', span: 1 },
  { id: 'note', type: 'note', span: 1 }, { id: 'links', type: 'links', span: 1 }, { id: 'meetings', type: 'meetings', span: 3 },
]
const ICONS = { head: 'trabajo', milestones: 'star', docs: 'doc', board: 'board', time: 'clock', note: 'note', links: 'link', meetings: 'calendario' }

const fmtTime = (min) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`)
const fmtClock = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * Un proyecto por dentro: progreso y plazo, línea de tiempo con hitos, sus tareas,
 * cronómetro de horas dedicadas, notas, enlaces propios y sus reuniones de la agenda.
 */
export default function ProjectView({ data, update, projectId, back, initialDoc = null }) {
  const today = todayISO()
  const project = (data.projects ?? []).find((p) => p.id === projectId)
  const [tick, setTick] = useState(0)
  const [docId, setDocId] = useState(initialDoc) // documento abierto
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState(false)
  useEffect(() => { if (!project?.timerStart) return; const id = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(id) }, [project?.timerStart])
  const dnd = useBlockDrag((fn) => update((d) => ({ ...d, projectBlocks: fn(d.projectBlocks ?? DEFAULT_BLOCKS) })), editing)
  useExitEdit(editing, () => { setEditing(false); setMenu(false) }, '.plan-block, .page-actions, .customize, .popup')
  if (!project) return null

  const change = (fn) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === projectId ? fn(p) : p)) }))
  if (docId && (project.docs ?? []).some((x) => x.id === docId)) return <DocView project={project} docId={docId} change={change} back={() => setDocId(null)} />
  const c = colorOf(data, projectId)
  // Distribución de bloques: la misma para todos los proyectos
  const blocks = data.projectBlocks ?? DEFAULT_BLOCKS
  const setBlocks = (fn) => update((d) => ({ ...d, projectBlocks: fn(d.projectBlocks ?? DEFAULT_BLOCKS) }))
  const move = (i, dir) => setBlocks((b) => { const n = [...b]; const j = i + dir; if (j < 0 || j >= n.length) return b; [n[i], n[j]] = [n[j], n[i]]; return n })
  const setSpan = (id, span) => setBlocks((b) => b.map((x) => (x.id === id ? { ...x, span } : x)))
  const removeBlock = (id) => setBlocks((b) => b.filter((x) => x.id !== id))
  const addBlock = (type) => { setBlocks((b) => [...b, DEFAULT_BLOCKS.find((x) => x.type === type)]); setMenu(false) }
  const missing = DEFAULT_BLOCKS.map((b) => b.type).filter((t) => !blocks.some((b) => b.type === t))
  const { total, done, pct } = progressOf(project)
  const left = project.deadline ? daysUntil(project.deadline) : null
  const time = project.time ?? {}
  const totalMin = Object.values(time).reduce((a, b) => a + b, 0)
  const meetings = [...(data.meetings ?? []).filter((m) => m.projectId === projectId), ...(project.meetings ?? [])].filter((m) => m.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))

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

  // Bloques de la página (el orden, ancho y cuáles se ven se pueden personalizar)
  const PARTS = {
    head: { cls: 'card wk-block pv-head', label: 'Resumen', render: () => (
      <>
      {project.shared && <SharedBar projectId={projectId} />}
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
      </>
    ) },
    milestones: { cls: 'card wk-block pv-ms-block', label: 'Cronograma', render: () => (
      <>
      <h3 className="w-title wk-title"><span className="dot" style={{ background: '#E84855' }} />Cronograma</h3>
      <Milestones project={project} change={change} color={c} />
      </>
    ) },
    docs: { cls: 'card wk-block pv-docs', label: 'Documentos', render: () => (
      <>
      <h3 className="w-title wk-title"><span className="dot" style={{ background: '#E84855' }} />Documentos</h3>
      <DocsBlock project={project} change={change} openDoc={setDocId} />
      </>
    ) },
    board: { cls: 'card wk-block wk-board', label: 'Tareas', render: () => (
      <>
      <h3 className="w-title wk-title"><span className="dot" style={{ background: '#E84855' }} />Tareas</h3>
      <BoardBlock data={data} update={update} onlyProject={projectId} />
      </>
    ) },
    time: { cls: 'card wk-block pv-time', label: 'Tiempo', render: () => (
      <>
      <h3 className="w-title wk-title"><span className="dot" style={{ background: '#E84855' }} />Tiempo</h3>
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
      </>
    ) },
    note: { cls: 'is-note', label: 'Notas', render: () => (
      <>
      <QuickNote note={{ color: c, ...note }} onChange={(n) => change((p) => ({ ...p, note: n }))} onDelete={() => change((p) => ({ ...p, note: { html: '' } }))} />
      </>
    ) },
    links: { cls: 'card wk-block wk-tools', label: 'Enlaces', render: () => (
      <>
      <h3 className="w-title wk-title"><span className="dot" style={{ background: '#E84855' }} />Enlaces</h3>
      <Tools data={linksData} update={linksUpdate} bare />
      </>
    ) },
    meetings: { cls: 'card wk-block pv-agenda', label: 'Agenda', render: () => (
      <>
      <h3 className="w-title wk-title"><span className="dot" style={{ background: '#E84855' }} />Agenda</h3>
      <AgendaBlock data={data} update={update} projectId={projectId} />
      </>
    ) },
  }

  return (
    <div className="page work project-view" style={{ '--c': c }}>
      <button className="back-link" onClick={back}><Icon name="back" size={18} /> Trabajo</button>
      <TopActions><div className="page-actions">
        {editing && (
          <div className="add-wrap">
            <button className="icon-btn" onClick={() => setMenu(!menu)} aria-label="Añadir bloque" aria-expanded={menu} title="Añadir"><Icon name="plus" size={22} /></button>
            {menu && (
              <div className="card add-menu" role="menu">
                {missing.map((t) => <button role="menuitem" key={t} onClick={() => addBlock(t)}><Icon name={ICONS[t]} size={20} />{PARTS[t].label}</button>)}
                {missing.length === 0 && <span className="muted add-empty">Ya están todos</span>}
              </div>
            )}
          </div>
        )}
        <button className={`icon-btn customize ${editing ? 'customize-on' : ''}`} onClick={() => { setEditing(!editing); setMenu(false) }}
          aria-label={editing ? 'Terminar de personalizar' : 'Personalizar'} title={editing ? 'Listo' : 'Personalizar'}>
          <Icon name={editing ? 'check' : 'board'} color={editing ? '#FFFFFF' : '#202124'} />
        </button>
      </div></TopActions>

      <div className={`plan-grid wk-grid ${editing ? 'is-editing' : ''}`}>
        {blocks.filter((b) => PARTS[b.type]).map((b, i) => (
          <section key={b.id} className={`plan-block span-${b.span} ${PARTS[b.type].cls} ${dnd.cls(b)}`} aria-label={PARTS[b.type].label} {...dnd.props(b)}>
            {editing && <BlockEdit span={b.span} onSpan={(n) => setSpan(b.id, n)} onRemove={() => removeBlock(b.id)} onMove={(dir) => move(i, dir)} first={i === 0} last={i === blocks.length - 1} />}
            {PARTS[b.type].render()}
          </section>
        ))}
      </div>
    </div>
  )
}
