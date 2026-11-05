import { useState } from 'react'
import { addDays, daysUntil, todayISO } from '../../lib/dates.js'

const BottleIcon = ({ open }) => (
  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#202124" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3h4M10.5 3v4L8 10v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V10l-2.5-3V3" fill={open ? '#3DDC97' : '#EFABFF'} />
  </svg>
)

/** Mensajes en una botella: escribes al tú del futuro y no se puede leer hasta la fecha. */
export default function Bottle({ size, data, update }) {
  const today = todayISO()
  const bottles = [...(data.bottles ?? [])].sort((a, b) => a.openDate.localeCompare(b.openDate))
  const closed = bottles.filter((b) => b.openDate > today)
  const next = closed[0]
  const [text, setText] = useState('')
  const [date, setDate] = useState(addDays(today, 30))

  const launch = (e) => {
    e.preventDefault()
    if (!text.trim() || date <= today) return
    update((d) => ({ ...d, bottles: [...(d.bottles ?? []), { id: crypto.randomUUID(), text: text.trim(), openDate: date, createdAt: today }] }))
    setText('')
  }

  if (size === 'S') {
    return (
      <div className="w-center">
        <BottleIcon />
        <b className="big">{closed.length}</b>
        <span className="w-hint">{next ? `abre en ${daysUntil(next.openDate)} d` : 'en el mar'}</span>
      </div>
    )
  }

  const list = (
    <ul className="bottles">
      {(size === 'M' ? bottles.slice(0, 2) : bottles).map((b) => {
        const open = b.openDate <= today
        return (
          <li key={b.id}>
            <BottleIcon open={open} />
            <span className={open ? 'w-text' : 'w-hint'}>{open ? b.text : `Se abre en ${daysUntil(b.openDate)} días`}</span>
          </li>
        )
      })}
      {bottles.length === 0 && <li className="w-hint">Ninguna botella aún</li>}
    </ul>
  )

  if (size === 'M') return list
  return (
    <>
      <form className="w-form w-form-col" onSubmit={launch}>
        <textarea placeholder="Escribe a tu yo del futuro" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={2} />
        <div className="w-form">
          <input type="date" value={date} min={addDays(today, 1)} onChange={(e) => setDate(e.target.value)} />
          <button className="pill pill-on" disabled={!text.trim()}>Lanzar</button>
        </div>
      </form>
      {list}
    </>
  )
}
