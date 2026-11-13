import { locale } from '../../i18n/index.js'
import { addDays, daysUntil, formatShort, todayISO, weekStart } from '../../lib/dates.js'
import { projectsOf } from '../../widgets/trabajo/projects.js'
import Empty from './Empty.jsx'
import { colorOf } from './shared.js'

const MIN_WEEKS = 10
const MAX_WEEKS = 40

/**
 * Cronograma: una barra por proyecto, de cuando empieza a su fecha límite, con sus hitos y la línea de «hoy».
 * Tocar el nombre abre el proyecto. Lo que ya pasó de largo queda a la izquierda, sin ocupar sitio extra.
 */
export default function Timeline({ data, openProject }) {
  const today = todayISO()
  const projects = projectsOf(data)
  if (!projects.length) return <Empty icon="chart" text="Aquí verás tus proyectos en el tiempo, con sus fechas e hitos" />

  const dates = projects.flatMap((p) => [p.deadline, ...(p.milestones ?? []).map((m) => m.date)]).filter(Boolean)
  const start = addDays(weekStart(today), -7)
  const lastDate = dates.reduce((a, b) => (b > a ? b : a), addDays(start, MIN_WEEKS * 7 - 1))
  const weeks = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.ceil((daysUntil(lastDate, start) + 1) / 7) + 1))
  const span = weeks * 7
  const pos = (iso) => Math.min(100, Math.max(0, (daysUntil(iso, start) / span) * 100))
  const every = weeks > 18 ? 4 : weeks > 12 ? 2 : 1
  const label = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })

  return (
    <div className="tl">
      <div className="tl-head"><span />
        <div className="tl-weeks">{Array.from({ length: weeks }, (_, i) => <span key={i} style={{ left: `${(i / weeks) * 100}%` }}>{i % every === 0 ? label(addDays(start, i * 7)) : ''}</span>)}</div>
      </div>
      <div className="tl-body">
        {projects.map((p) => {
          const c = colorOf(data, p.id)
          const from = p.createdAt && p.createdAt > start ? p.createdAt : start
          const to = p.deadline ?? addDays(from, 28)
          const left = pos(from)
          const width = Math.max(1.5, pos(to) - left)
          return (
            <div key={p.id} className="tl-row">
              <button className="tl-name" onClick={() => openProject?.(p.id)} title="Abrir proyecto"><span className="dot" style={{ background: c }} />{p.name}</button>
              <div className="tl-lane" style={{ '--w': weeks }}>
                <span className={`tl-bar ${p.deadline ? '' : 'is-open'}`} style={{ left: `${left}%`, width: `${width}%`, '--c': c }} title={p.deadline ? `Hasta el ${formatShort(p.deadline)}` : 'Sin fecha límite'} />
                {(p.milestones ?? []).map((m) => <span key={m.id} className={`tl-ms ${m.done ? 'is-done' : ''}`} style={{ left: `${pos(m.date)}%`, '--c': c }} title={`${m.title} · ${formatShort(m.date)}`} />)}
              </div>
            </div>
          )
        })}
        <span className="tl-today" style={{ left: `calc(var(--tl-name) + (100% - var(--tl-name)) * ${pos(today) / 100})` }}><em>hoy</em></span>
      </div>
    </div>
  )
}
