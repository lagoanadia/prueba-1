import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { locale } from '../../i18n/index.js'
import { addDays, daysUntil, formatShort, todayISO, weekStart } from '../../lib/dates.js'
import { projectsOf } from '../../widgets/trabajo/projects.js'
import Empty from './Empty.jsx'
import { colorOf } from './shared.js'

const MIN_WEEKS = 8
const MAX_DAYS = 182 // 6 meses
const MAX_WEEKS = 55

/**
 * Cronograma: una barra por proyecto, de cuando empieza a su fecha límite, con sus hitos y la línea de «hoy».
 * Tocar el nombre abre el proyecto. Lo que ya pasó de largo queda a la izquierda, sin ocupar sitio extra.
 */
export default function Timeline({ data, openProject, onMilestone = null, openId = null, labels = false }) {
  const today = todayISO()
  const [past, setPast] = useState(false) // ver también lo que ya pasó (hasta 6 meses atrás)
  const projects = projectsOf(data)
  if (!projects.length) return <Empty icon="chart" text="Aquí verás tus proyectos en el tiempo, con sus fechas e hitos" />

  const limit = addDays(today, MAX_DAYS) // como mucho 6 meses vista
  const earliest = addDays(today, -MAX_DAYS)
  const dates = projects.flatMap((p) => [p.createdAt, p.deadline, ...(p.milestones ?? []).map((m) => m.date)]).filter(Boolean)
  const oldest = dates.reduce((a, b) => (b < a ? b : a), today)
  const hasPast = oldest < today && projects.some((p) => (p.createdAt && p.createdAt < today) || (p.milestones ?? []).some((m) => m.date < today))
  // Va en el día: empieza hoy. Con «ver pasado» retrocede hasta donde empezó todo (máximo 6 meses)
  const start = past ? weekStart(oldest < earliest ? earliest : oldest) : today
  const lastDate = dates.reduce((a, b) => (b > a ? b : a), addDays(start, MIN_WEEKS * 7 - 1))
  const end = lastDate > limit ? limit : lastDate
  const weeks = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.ceil((daysUntil(end, start) + 1) / 7) + 1))
  const span = weeks * 7
  const inView = (iso) => iso >= start && daysUntil(iso, start) <= span
  const pos = (iso) => Math.min(100, Math.max(0, (daysUntil(iso, start) / span) * 100))
  const every = weeks > 18 ? 4 : weeks > 12 ? 2 : 1
  const sorted = (p) => [...(p.milestones ?? [])].filter((m) => inView(m.date)).sort((a, b) => a.date.localeCompare(b.date))
  const label = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
  // Un proyecto que ya acabó del todo no ocupa fila salvo que pidas ver lo pasado
  const rows = projects.filter((p) => past || !p.deadline || p.deadline >= today)

  return (
    <div className="tl">
      <div className="tl-head"><span>{hasPast && <button type="button" className={`tl-past ${past ? 'on' : ''}`} onClick={() => setPast(!past)} aria-pressed={past} title={past ? 'Ocultar lo que ya pasó' : 'Ver lo que ya pasó (hasta 6 meses)'}><Icon name="history" size={14} />{past ? 'Ocultar pasado' : 'Ver pasado'}</button>}</span>
        <div className="tl-weeks">
          {!past && <span className="tl-hoy" style={{ left: 0 }}>hoy</span>}
          {Array.from({ length: weeks }, (_, i) => (past || i > 0) && <span key={i} style={{ left: `${(i / weeks) * 100}%` }}>{i % every === 0 ? label(addDays(start, i * 7)) : ''}</span>)}
        </div>
      </div>
      <div className="tl-body">
        {rows.map((p) => {
          const c = colorOf(data, p.id)
          const from = p.createdAt && p.createdAt > start ? p.createdAt : start
          const to = p.deadline ?? addDays(from, 28)
          const left = pos(from)
          const width = Math.max(1.5, pos(to > addDays(start, span) ? addDays(start, span) : to) - left)
          return (
            <div key={p.id} className={`tl-row ${labels ? 'has-labels' : ''}`}>
              {labels ? <span className="tl-name is-static"><span className="dot" style={{ background: c }} />Proyecto</span> : <button className="tl-name" onClick={() => openProject?.(p.id)} title="Abrir proyecto"><span className="dot" style={{ background: c }} />{p.name}</button>}
              <div className="tl-lane" style={{ '--w': weeks }}>
                <span className={`tl-bar ${p.deadline ? '' : 'is-open'}`} style={{ left: `${left}%`, width: `${width}%`, '--c': c }} title={p.deadline ? `Hasta el ${formatShort(p.deadline)}` : 'Sin fecha límite'} />
                {sorted(p).map((m) => {
                  const Tag = onMilestone ? 'button' : 'span'
                  return (
                    <Tag key={m.id} className={`tl-ms-wrap ${onMilestone ? 'is-btn' : ''} ${openId === m.id ? 'is-open' : ''}`} style={{ left: `${pos(m.date)}%`, '--c': c }} title={`${m.title} · ${formatShort(m.date)}`}
                      {...(onMilestone ? { type: 'button', onClick: () => onMilestone(m), 'aria-expanded': openId === m.id } : {})}>
                      <span className={`tl-ms ${m.done ? 'is-done' : ''}`} />
                      {labels && <span className="tl-ms-label"><b>{m.title}</b><span>{formatShort(m.date).replace(/^\S+ /, '')}</span></span>}
                    </Tag>
                  )
                })}
              </div>
            </div>
          )
        })}
        <span className="tl-today" style={{ left: `calc(var(--tl-name) + (100% - var(--tl-name)) * ${pos(today) / 100})` }}>{past && <em>hoy</em>}</span>
      </div>
    </div>
  )
}
