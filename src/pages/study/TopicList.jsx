import { useState } from 'react'
import { TOPIC_STATES } from '../../widgets/estudios/study.js'
import { changeUnit } from './helpers.js'

const NEXT = { todo: 'doing', doing: 'clear', clear: 'todo' }
const STATE = Object.fromEntries(TOPIC_STATES.map((s) => [s.id, s]))

/** Temas de una unidad: pulsar el estado lo cambia (sin empezar → en curso → claro). */
export default function TopicList({ update, subjectId, unit, onNotes }) {
  const [name, setName] = useState('')
  const change = (fn) => changeUnit(update, subjectId, unit.id, fn)
  const cycle = (id) => change((u) => ({ ...u, topics: u.topics.map((t) => (t.id === id ? { ...t, state: NEXT[t.state] } : t)) }))
  const remove = (id) => change((u) => ({ ...u, topics: u.topics.filter((t) => t.id !== id) }))
  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    change((u) => ({ ...u, topics: [...u.topics, { id: crypto.randomUUID(), name: name.trim(), state: 'todo' }] }))
    setName('')
  }
  return (
    <>
      <ol className="topic-list">
        {unit.topics.map((t) => (
          <li key={t.id}>
            <span className={t.state === 'clear' ? 'is-clear' : ''}>{t.name}</span>
            {onNotes && <button className="text-link" onClick={() => onNotes(t.id)}>Apuntes</button>}
            <button className="state-chip" style={{ background: STATE[t.state].color }} onClick={() => cycle(t.id)}>{STATE[t.state].label}</button>
            <button className="prio-x" onClick={() => remove(t.id)} aria-label={`Quitar «${t.name}»`}>×</button>
          </li>
        ))}
      </ol>
      <form onSubmit={add}><input className="line-input" placeholder="+ Tema" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></form>
    </>
  )
}
