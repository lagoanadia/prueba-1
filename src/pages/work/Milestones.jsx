import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { soft } from './shared.js'

const relative = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : n > 0 ? `en ${n} días` : `hace ${-n} días`)

/**
 * Hitos del proyecto: a la izquierda el próximo con su cuenta atrás; a la derecha el recorrido
 * como paradas de una línea, con «Hoy» marcado entre lo pasado y lo que viene.
 */
export default function Milestones({ project, change, color }) {
  const today = todayISO()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const list = [...(project.milestones ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const next = list.find((m) => !m.done)
  const doneCount = list.filter((m) => m.done).length
  const todayAt = list.findIndex((m) => m.date >= today) // dónde va la marca de hoy

  const toggle = (id) => change((p) => ({ ...p, milestones: p.milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m)) }))
  const remove = (id) => change((p) => ({ ...p, milestones: p.milestones.filter((m) => m.id !== id) }))
  const add = (e) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    change((p) => ({ ...p, milestones: [...(p.milestones ?? []), { id: crypto.randomUUID(), title: title.trim(), date, done: false }] }))
    setTitle('')
    setDate('')
  }

  const todayRow = <li key="hoy" className="ms-today"><span className="ms-node" /><span>Hoy · {formatShort(today)}</span></li>

  return (
    <div className="ms" style={{ '--c': color }}>
      <div className="ms-next" style={{ background: soft(color, 22) }}>
        <span className="ms-kicker">{next ? 'Próximo hito' : list.length ? 'Todo cumplido' : 'Sin hitos'}</span>
        {next ? (
          <>
            <b className="ms-next-title">{next.title}</b>
            <span className={`ms-count ${daysUntil(next.date) < 0 ? 'is-late' : ''}`}>
              <b>{Math.abs(daysUntil(next.date))}</b>
              <span>{daysUntil(next.date) < 0 ? 'días de retraso' : daysUntil(next.date) === 1 ? 'día' : 'días'}</span>
            </span>
            <span className="ms-date">{formatShort(next.date)}</span>
          </>
        ) : <span className="ms-date">{list.length ? '¡Bien hecho!' : 'Añade entregas, demos, lanzamientos…'}</span>}
        {list.length > 0 && (
          <span className="ms-progress">
            <span className="ms-pips">{list.map((m) => <span key={m.id} className={m.done ? 'on' : ''} />)}</span>
            {doneCount} de {list.length}
          </span>
        )}
      </div>

      <div className="ms-route">
        <ol className="ms-list">
          {list.map((m, i) => {
            const n = daysUntil(m.date)
            const late = !m.done && n < 0
            return [
              i === todayAt && todayRow,
              <li key={m.id} className={`ms-stop ${m.done ? 'is-done' : ''} ${late ? 'is-late' : ''} ${m === next ? 'is-next' : ''}`}>
                <button className="ms-node" onClick={() => toggle(m.id)} aria-label={m.done ? `Desmarcar ${m.title}` : `Marcar ${m.title} como cumplido`}>
                  {m.done && <Icon name="check" size={14} color="#FFFFFF" />}
                </button>
                <span className="ms-text">
                  <b>{m.title}</b>
                  <span>{formatShort(m.date)} · {m.done ? 'cumplido' : late ? `${-n} días tarde` : relative(n)}</span>
                </span>
                <button className="wk-x" onClick={() => remove(m.id)} aria-label={`Quitar ${m.title}`}><Icon name="close" size={12} /></button>
              </li>,
            ]
          })}
          {todayAt === -1 && list.length > 0 && todayRow}
        </ol>
        <form className="ms-add" onSubmit={add}>
          <span className="ms-node ms-node-add"><Icon name="plus" size={14} /></span>
          <input placeholder="Nuevo hito" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} aria-label="Nuevo hito" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Fecha del hito" />
          <button className="pill pill-sm" disabled={!title.trim() || !date}>Añadir</button>
        </form>
      </div>
    </div>
  )
}
