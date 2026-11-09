import AddPopup from '../AddPopup.jsx'
import { useState } from 'react'

const pct = (g) => Math.min(100, Math.round((g.current / g.target) * 100))
// "Leer 12 libros este año" -> "libros" (la palabra que va después del número)
const unitOf = (name) => name.match(/\d+\s+(\p{L}+)/u)?.[1] ?? ''

/** Metas. S: la primera · T: lista vertical · M: hasta 2 · L: todas, con − / + / Quitar y añadir. */
export default function Goals({ size, data, update }) {
  const goals = data.goals ?? []
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')

  const change = (id, delta) => update((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) } : g)) }))
  const remove = (id) => update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }))
  const add = (e) => {
    e.preventDefault()
    if (!name.trim() || !(Number(target) > 0)) return
    update((d) => ({ ...d, goals: [...(d.goals ?? []), { id: crypto.randomUUID(), name: name.trim(), current: 0, target: Number(target) }] }))
    setName('')
    setTarget('')
  }

  const form = (close) => (
    <form className="w-form" onSubmit={(e) => { add(e); if (name.trim() && Number(target) > 0) close?.() }}>
      <input autoFocus={Boolean(close)} placeholder="Nueva meta" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      <input type="number" min="1" placeholder="10" value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 64, flex: 'none' }} aria-label="Objetivo" />
      <button className="pill pill-soft">Añadir meta</button>
    </form>
  )
  const addBtn = size !== 'L' && <AddPopup label="Nueva meta">{form}</AddPopup>

  // S: la primera meta; tocar el anillo suma uno
  if (size === 'S') {
    const g = goals[0]
    if (!g) return <>{addBtn}<p className="w-hint w-center">Sin metas</p></>
    return (
      <div className="w-center">
        {addBtn}
        <button className="ring ring-btn" style={{ '--p': pct(g) }} onClick={() => change(g.id, 1)} aria-label={`Sumar uno a ${g.name}`}><b>{pct(g)}%</b></button>
        <span className="w-hint w-ellipsis">{g.name} · {g.current}/{g.target}</span>
      </div>
    )
  }

  return (
    <>
      <ul className="goals">
        {goals.map((g) => (
          <li key={g.id}>
            <div className="goal-top"><span className="w-ellipsis">{g.name}</span><b>{pct(g)} %</b></div>
            <div className="bar"><span style={{ width: `${pct(g)}%` }} /></div>
            {size !== 'L' && (
              <div className="goal-ctrl">
                <span className="w-hint">{g.current}/{g.target}</span>
                <button className="mini" onClick={() => change(g.id, -1)} aria-label="Menos">−</button>
                <button className="mini" onClick={() => change(g.id, 1)} aria-label="Más">+</button>
              </div>
            )}
            {size === 'L' && (
              <div className="goal-ctrl">
                <span className="w-hint">{g.current} de {g.target} {unitOf(g.name)}</span>
                <button className="mini" onClick={() => change(g.id, -1)} aria-label="Menos">−</button>
                <button className="mini" onClick={() => change(g.id, 1)} aria-label="Más">+</button>
                <button className="pill pill-sm" onClick={() => remove(g.id)}>Quitar</button>
              </div>
            )}
          </li>
        ))}
        {goals.length === 0 && <li className="w-hint">Sin metas</li>}
      </ul>
      {addBtn}
      {size === 'L' && form()}
    </>
  )
}
