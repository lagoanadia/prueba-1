import { useState } from 'react'
import History from '../../components/History.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'

/** Una cosa buena del día. S: la de hoy · M y L: escribirla. Los días anteriores, en el historial. */
export default function Good({ size, data, update }) {
  const today = todayISO()
  const good = data.good ?? {}
  const [text, setText] = useState(good[today] ?? '')
  const save = (e) => {
    e.preventDefault()
    update((d) => ({ ...d, good: { ...d.good, [today]: text.trim() } }))
  }

  if (size === 'S') return <p className={good[today] ? 'w-text w-clamp' : 'w-hint w-center'}>{good[today] || '¿Algo bueno hoy?'}</p>

  const past = Object.keys(good).filter((d) => d < today && good[d]).sort().reverse()
  return (
    <>
      <History title="Cosas buenas" empty="Aún no hay días anteriores" items={past.map((d) => ({ id: d, date: formatShort(d), text: good[d] }))} />
      <form className={`w-form ${size === 'L' || size === 'T' ? 'w-form-col w-grow' : ''}`} onSubmit={save}>
        {size === 'L' || size === 'T'
          ? <textarea placeholder="¿Qué ha salido bien hoy?" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} rows={4} />
          : <input placeholder="¿Algo bueno hoy?" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />}
        <button className="pill pill-on" disabled={text.trim() === (good[today] ?? '')}>Guardar</button>
      </form>
    </>
  )
}
