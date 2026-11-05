import { useState } from 'react'
import { activeSubjectOf, progressOf, subjectsOf } from './study.js'

const COLORS = ['#3185FC', '#E84855', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF']

/**
 * Asignaturas: progreso = temas «claros» / total. Tocar una la abre en el widget «Temario».
 * S: progreso global · M: 3 primeras · T: todas · L: todas + nueva asignatura.
 */
export default function Subjects({ size, data, update }) {
  const subjects = subjectsOf(data)
  const active = activeSubjectOf(data)
  const [short, setShort] = useState('')
  const [name, setName] = useState('')

  const select = (id) => update((d) => ({ ...d, activeSubject: id }))
  const add = (e) => {
    e.preventDefault()
    if (!short.trim()) return
    const id = crypto.randomUUID()
    update((d) => {
      const list = subjectsOf(d)
      return { ...d, activeSubject: id, subjects: [...list, { id, short: short.trim().toUpperCase(), name: name.trim() || short.trim(), color: COLORS[list.length % COLORS.length], units: [{ id: crypto.randomUUID(), name: 'UD1', topics: [] }] }] }
    })
    setShort('')
    setName('')
  }

  if (size === 'S') {
    const all = subjects.map(progressOf)
    const total = all.reduce((s, p) => s + p.total, 0)
    const clear = all.reduce((s, p) => s + p.clear, 0)
    const pct = total ? Math.round((clear / total) * 100) : 0
    return <div className="w-center"><div className="ring ring-green" style={{ '--p': pct }}><b>{pct}%</b></div><span className="w-hint">{clear} de {total} temas</span></div>
  }

  return (
    <>
      <ul className="subjects">
        {(size === 'M' ? subjects.slice(0, 3) : subjects).map((s) => {
          const { total, clear, pct } = progressOf(s)
          return (
            <li key={s.id}>
              <button className={`subject ${active?.id === s.id ? 'is-active' : ''}`} onClick={() => select(s.id)} title={s.name}>
                <span className="subject-tag" style={{ background: s.color }}>{s.short}</span>
                <span className="subject-body">
                  <span className="goal-top"><span className="w-ellipsis">{size === 'M' ? s.short : s.name}</span><b>{pct} %</b></span>
                  <span className="bar"><span style={{ width: `${pct}%`, background: s.color }} /></span>
                  {size !== 'M' && <span className="w-hint">{total ? `${clear} de ${total} temas` : 'Sin temas todavía'}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {size === 'L' && (
        <form className="w-form" onSubmit={add}>
          <input placeholder="Siglas" value={short} onChange={(e) => setShort(e.target.value)} maxLength={6} style={{ width: 80, flex: 'none' }} />
          <input placeholder="Nombre de la asignatura" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className="pill pill-soft" disabled={!short.trim()}>Añadir</button>
        </form>
      )}
    </>
  )
}
