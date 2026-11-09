import { useState } from 'react'
import ResourceCards from './ResourceCards.jsx'
import TopicList from './TopicList.jsx'
import { changeUnit, unitProgress } from './helpers.js'

const TABS = ['Temario', 'Apuntes', 'Recursos', 'Ejercicios']

/** Página de una unidad: temario, apuntes por tema, recursos y ejercicios. */
export default function UnitView({ data, update, subject, unit, back, openNotes }) {
  const [tab, setTab] = useState('Temario')
  const [exercise, setExercise] = useState('')
  const p = unitProgress(unit)
  const exercises = unit.exercises ?? []
  const done = exercises.filter((x) => x.done).length
  const change = (fn) => changeUnit(update, subject.id, unit.id, fn)
  const addExercise = (e) => {
    e.preventDefault()
    if (!exercise.trim()) return
    change((u) => ({ ...u, exercises: [...(u.exercises ?? []), { id: crypto.randomUUID(), title: exercise.trim(), done: false }] }))
    setExercise('')
  }
  const toggle = (id) => change((u) => ({ ...u, exercises: u.exercises.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }))
  const removeExercise = (id) => change((u) => ({ ...u, exercises: u.exercises.filter((x) => x.id !== id) }))

  return (
    <div className="page study" style={{ '--c': subject.color }}>
      <button className="back-link" onClick={back}>← {subject.short}</button>
      <header className="page-head">
        <div>
          <h1>{unit.name}</h1>
          <p className="muted page-sub">{p.clear} de {p.total} temas claros · {done} de {exercises.length} ejercicios hechos</p>
        </div>
        <button className="btn-solid" style={{ '--c': '#3185FC' }} disabled={!unit.topics.length} onClick={() => openNotes(unit.topics[0].id)}>Abrir editor de apuntes</button>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="card tab-panel" key={tab}>
        {tab === 'Temario' && <TopicList update={update} subjectId={subject.id} unit={unit} onNotes={openNotes} />}
        {tab === 'Apuntes' && (
          <ul className="study-list">
            {unit.topics.map((t, i) => {
              const blocks = data.notes?.[t.id] ?? []
              const first = blocks.find((b) => b.type !== 'image')?.text
              return (
                <li key={t.id} className="note-row" onClick={() => openNotes(t.id)}>
                  <b>Tema {i + 1} · {t.name}</b>
                  <span className="muted w-ellipsis">{first || 'Sin apuntes'}</span>
                  <span className="text-link">Editar</span>
                </li>
              )
            })}
            {unit.topics.length === 0 && <li className="muted">Añade temas en el temario</li>}
          </ul>
        )}
        {tab === 'Recursos' && <ResourceCards data={data} update={update} subjectId={subject.id} unitId={unit.id} />}
        {tab === 'Ejercicios' && (
          <>
            <ul className="study-list">
              {exercises.map((x) => (
                <li key={x.id}>
                  <label className="ex-row"><input type="checkbox" checked={x.done} onChange={() => toggle(x.id)} /><span className={x.done ? 'is-clear' : ''}>{x.title}</span></label>
                  <button className="prio-x" onClick={() => removeExercise(x.id)} aria-label="Quitar">×</button>
                </li>
              ))}
              {exercises.length === 0 && <li className="muted">Sin ejercicios todavía</li>}
            </ul>
            <form onSubmit={addExercise}><input className="line-input" placeholder="+ Ejercicio" value={exercise} onChange={(e) => setExercise(e.target.value)} maxLength={80} /></form>
          </>
        )}
      </div>
    </div>
  )
}
