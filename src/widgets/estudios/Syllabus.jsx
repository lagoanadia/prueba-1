import { useState } from 'react'
import { TOPIC_STATES, activeSubjectOf, progressOf, subjectsOf } from './study.js'

/**
 * Temario de la asignatura elegida: unidades y temas. Tocar el estado de un tema lo cambia:
 * Sin empezar → En curso → Claro. S: resumen · M: la unidad en curso · T: todo en lista · L: todo + añadir temas.
 */
export default function Syllabus({ size, data, update }) {
  const subject = activeSubjectOf(data)
  const [topic, setTopic] = useState('')
  const [unitId, setUnitId] = useState(null)
  if (!subject) return <p className="w-hint w-center">Sin asignaturas</p>

  const { total, clear } = progressOf(subject)
  const change = (fn) => update((d) => ({ ...d, subjects: subjectsOf(d).map((s) => (s.id === subject.id ? fn(s) : s)) }))
  const cycle = (uid, tid) => change((s) => ({
    ...s,
    units: s.units.map((u) => (u.id !== uid ? u : { ...u, topics: u.topics.map((t) => (t.id !== tid ? t : { ...t, state: TOPIC_STATES[(TOPIC_STATES.findIndex((x) => x.id === t.state) + 1) % 3].id })) })),
  }))
  const target = unitId ?? subject.units[subject.units.length - 1]?.id
  const addTopic = (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    change((s) => ({ ...s, units: s.units.map((u) => (u.id === target ? { ...u, topics: [...u.topics, { id: crypto.randomUUID(), name: topic.trim(), state: 'todo' }] } : u)) }))
    setTopic('')
  }
  const addUnit = () => change((s) => ({ ...s, units: [...s.units, { id: crypto.randomUUID(), name: `UD${s.units.length + 1}`, topics: [] }] }))

  if (size === 'S') {
    return (
      <div className="w-center">
        <span className="subject-tag" style={{ background: subject.color }}>{subject.short}</span>
        <b className="big">{clear}<small>/{total}</small></b>
        <span className="w-hint">temas claros</span>
      </div>
    )
  }

  // M: solo la primera unidad que no esté terminada
  const units = size === 'M' ? [subject.units.find((u) => u.topics.some((t) => t.state !== 'clear')) ?? subject.units[0]].filter(Boolean) : subject.units

  return (
    <>
      <span className="w-hint w-ellipsis">{subject.name}</span>
      <div className="syllabus">
        {units.map((u) => (
          <div key={u.id} className="unit">
            <span className="kb-head">{u.name} · {u.topics.filter((t) => t.state === 'clear').length} de {u.topics.length}</span>
            <ul>
              {u.topics.map((t) => {
                const st = TOPIC_STATES.find((x) => x.id === t.state)
                return (
                  <li key={t.id}>
                    <span className="w-ellipsis topic-name">{t.name}</span>
                    <button className={`topic-state st-${t.state}`} style={{ '--c': st.color }} onClick={() => cycle(u.id, t.id)} title="Toca para cambiar el estado">
                      {size === 'T' ? '' : st.label}
                    </button>
                  </li>
                )
              })}
              {u.topics.length === 0 && <li className="w-hint">Sin temas</li>}
            </ul>
          </div>
        ))}
      </div>
      {size === 'L' && (
        <form className="w-form" onSubmit={addTopic}>
          <select value={target} onChange={(e) => setUnitId(e.target.value)} style={{ flex: 'none' }}>
            {subject.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input placeholder="Nuevo tema" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={60} />
          <button type="button" className="pill pill-sm" onClick={addUnit}>+ UD</button>
        </form>
      )}
    </>
  )
}
