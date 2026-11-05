import { useState } from 'react'

const pct = (g) => Math.min(100, Math.round((g.current / g.target) * 100))

/** Metas con barra de progreso. S: la primera · M: hasta 3 · L: todas, con − / + y añadir. */
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

  if (size === 'S') {
    const g = goals[0]
    if (!g) return <p className="w-hint w-center">Sin metas</p>
    return (
      <div className="w-center">
        <div className="ring" style={{ '--p': pct(g) }}><b>{pct(g)}%</b></div>
        <span className="w-hint w-ellipsis">{g.name}</span>
      </div>
    )
  }

  return (
    <>
      <ul className="goals">
        {(size === 'M' ? goals.slice(0, 3) : goals).map((g) => (
          <li key={g.id}>
            <div className="goal-top"><span className="w-ellipsis">{g.name}</span><b>{pct(g)}%</b></div>
            <div className="bar"><span style={{ width: `${pct(g)}%` }} /></div>
            {size === 'L' && (
              <div className="goal-ctrl">
                <span className="w-hint">{g.current}/{g.target}</span>
                <button className="mini" onClick={() => change(g.id, -1)} aria-label="Menos">−</button>
                <button className="mini" onClick={() => change(g.id, 1)} aria-label="Más">+</button>
                <button className="mini" onClick={() => remove(g.id)} aria-label="Quitar">×</button>
              </div>
            )}
          </li>
        ))}
        {goals.length === 0 && <li className="w-hint">Sin metas</li>}
      </ul>
      {size === 'L' && (
        <form className="w-form" onSubmit={add}>
          <input placeholder="Nueva meta" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <input type="number" min="1" placeholder="10" value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 64 }} />
          <button className="mini mini-primary" aria-label="Añadir">+</button>
        </form>
      )}
    </>
  )
}
