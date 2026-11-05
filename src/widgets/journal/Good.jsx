import { useState } from 'react'
import { addDays, formatShort, todayISO } from '../../lib/dates.js'

/** Una cosa buena del día. S: la de hoy · M: escribirla · L: + días anteriores. */
export default function Good({ size, data, update }) {
  const today = todayISO()
  const good = data.good ?? {}
  const [text, setText] = useState(good[today] ?? '')
  const save = (e) => {
    e.preventDefault()
    update((d) => ({ ...d, good: { ...d.good, [today]: text.trim() } }))
  }

  if (size === 'S') return <p className={good[today] ? 'w-text w-clamp' : 'w-hint w-center'}>{good[today] || '¿Algo bueno hoy?'}</p>

  const previous = Array.from({ length: 30 }, (_, i) => addDays(today, -i - 1)).filter((d) => good[d]).slice(0, 3)
  return (
    <>
      <form className="w-form" onSubmit={save}>
        <input placeholder="¿Algo bueno hoy?" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
        <button className="pill pill-on" disabled={text.trim() === (good[today] ?? '')}>Guardar</button>
      </form>
      {size === 'L' && (
        <ul className="good-list">
          {previous.map((d) => <li key={d}><span className="w-hint">{formatShort(d)}</span><span className="w-text">{good[d]}</span></li>)}
        </ul>
      )}
    </>
  )
}
