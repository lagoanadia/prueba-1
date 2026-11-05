import { useState } from 'react'
import History from '../../components/History.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'

const MAX = 3

/** Prioridades de hoy: las 3 cosas importantes. Las de días anteriores, al historial. */
export default function Priorities({ size, data, update }) {
  const today = todayISO()
  const all = data.priorities ?? {}
  const list = all[today] ?? []
  const [text, setText] = useState('')

  const setList = (fn) => update((d) => ({ ...d, priorities: { ...d.priorities, [today]: fn(d.priorities?.[today] ?? []) } }))
  const toggle = (id) => setList((l) => l.map((p) => (p.id === id ? { ...p, done: !p.done } : p)))
  const remove = (id) => setList((l) => l.filter((p) => p.id !== id))
  const add = (e) => {
    e.preventDefault()
    if (!text.trim() || list.length >= MAX) return
    setList((l) => [...l, { id: crypto.randomUUID(), text: text.trim(), done: false }])
    setText('')
  }
  const past = Object.keys(all).filter((d) => d < today && all[d].length).sort().reverse()
  const history = <History title="Prioridades anteriores" empty="Aún no hay días anteriores" items={past.map((d) => ({ id: d, date: formatShort(d), text: all[d].map((p) => `${p.done ? '✓' : '○'} ${p.text}`).join('  ·  ') }))} />

  if (size === 'S') {
    const next = list.find((p) => !p.done)
    return <div className="w-center">{history}<b className="big">{list.filter((p) => p.done).length}/{list.length || MAX}</b><span className="w-hint w-ellipsis">{next ? next.text : list.length ? '¡Todo hecho!' : 'Sin prioridades'}</span></div>
  }

  return (
    <>
      {history}
      <ol className="prios">
        {list.map((p, i) => (
          <li key={p.id} className={p.done ? 'is-done' : ''}>
            <button className="prio-num" onClick={() => toggle(p.id)} aria-label={p.done ? 'Marcar pendiente' : 'Marcar hecha'}>{p.done ? '✓' : i + 1}</button>
            <span className="w-ellipsis prio-text">{p.text}</span>
            {size !== 'M' && <button className="prio-x" onClick={() => remove(p.id)} aria-label="Quitar">×</button>}
          </li>
        ))}
      </ol>
      {list.length < MAX && (
        <form className="w-form" onSubmit={add}>
          <input placeholder={list.length ? 'Otra prioridad' : '¿Qué es lo importante hoy?'} value={text} onChange={(e) => setText(e.target.value)} maxLength={60} />
        </form>
      )}
    </>
  )
}
