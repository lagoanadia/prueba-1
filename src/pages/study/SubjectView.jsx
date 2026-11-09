import { formatShort, todayISO } from '../../lib/dates.js'
import { progressOf } from '../../widgets/estudios/study.js'
import ResourceCards from './ResourceCards.jsx'
import TopicList from './TopicList.jsx'
import { changeSubject, unitProgress } from './helpers.js'

/** Página de una asignatura: progreso, entregas, unidades con sus temas y recursos. */
export default function SubjectView({ data, update, subject, back, openUnit }) {
  const today = todayISO()
  const { total, clear, pct } = progressOf(subject)
  const exercises = subject.units.flatMap((u) => u.exercises ?? [])
  const upcoming = (data.assignments ?? []).filter((a) => a.course === subject.short && !a.done).sort((a, b) => a.due.localeCompare(b.due))
  const addUnit = () => changeSubject(update, subject.id, (s) => ({ ...s, units: [...s.units, { id: crypto.randomUUID(), name: `UD${s.units.length + 1}`, topics: [] }] }))
  const rename = (unitId, name) => changeSubject(update, subject.id, (s) => ({ ...s, units: s.units.map((u) => (u.id === unitId ? { ...u, name: name.trim() || u.name } : u)) }))

  return (
    <div className="page study" style={{ '--c': subject.color }}>
      <button className="back-link" onClick={back}>← Estudios</button>
      <header className="page-head">
        <div>
          <h1>{subject.name}</h1>
          <input className="desc-input muted" placeholder="Añade una descripción" defaultValue={subject.description ?? ''} maxLength={140}
            onBlur={(e) => changeSubject(update, subject.id, (s) => ({ ...s, description: e.target.value.trim() }))} />
        </div>
      </header>

      <div className="study-mid">
        <section className="card progress-card">
          <span>Progreso general</span>
          <span className="w-row"><b className="progress-big">{clear} de {total} temas claros</b><b className="progress-big">{pct} %</b></span>
          <span className="bar"><span style={{ width: `${pct}%` }} /></span>
          <span>Estado general: {pct === 100 && total ? 'completada' : clear ? 'en curso' : 'sin empezar'} · {subject.units.length} unidades · {exercises.length} prácticas</span>
        </section>
        <section>
          <h2 className="page-h2">Próximas entregas</h2>
          <ul className="card study-list">
            {upcoming.map((a) => (
              <li key={a.id}><span className="dot" style={{ background: subject.color }} /><b>{a.title}</b><span className="muted" style={{ marginLeft: 'auto' }}>{formatShort(a.due)}</span>{a.due < today && <span className="badge-late">Vencida</span>}</li>
            ))}
            {upcoming.length === 0 && <li className="muted">Nada pendiente</li>}
          </ul>
        </section>
      </div>

      <div className="page-head page-head-sm">
        <h2 className="page-h2">Unidades</h2>
        <button className="pill pill-soft" onClick={addUnit}>+ Unidad</button>
      </div>
      <div className="unit-cards">
        {subject.units.map((u, i) => {
          const p = unitProgress(u)
          return (
            <section key={u.id} className="card unit-card" style={{ '--i': i }}>
              <div className="w-row">
                <input className="unit-name" defaultValue={u.name} maxLength={40} onBlur={(e) => rename(u.id, e.target.value)} aria-label="Nombre de la unidad" />
                <span className="muted">{p.clear}/{p.total}</span>
              </div>
              <TopicList update={update} subjectId={subject.id} unit={u} />
              <button className="text-link unit-enter" onClick={() => openUnit(u.id)}>Entrar en la unidad →</button>
            </section>
          )
        })}
      </div>

      <h2 className="page-h2 page-gap">Recursos complementarios</h2>
      <ResourceCards data={data} update={update} subjectId={subject.id} />
    </div>
  )
}
