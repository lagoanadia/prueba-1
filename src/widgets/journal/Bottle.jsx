import { useState } from 'react'
import { createPortal } from 'react-dom'
import History from '../../components/History.jsx'
import Icon from '../../components/Icon.jsx'
import { addDays, daysUntil, formatLong, formatShort, todayISO } from '../../lib/dates.js'

const Jar = ({ ready }) => (
  <svg aria-hidden="true" width="26" height="30" viewBox="0 0 24 28" fill="none" stroke="#202124" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6M9.5 2v3.5L7 8.5v15a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-15L14.5 5.5V2" fill={ready ? '#EFABFF' : '#E8F0FE'} />
    <path d="M10 15.5c1-1 3-1 4 0M10 19c1 1 3 1 4 0" />
  </svg>
)

/**
 * Cápsulas del tiempo: escribes al tú del futuro y queda sellada hasta la fecha.
 * - Cerradas: cuenta atrás.  - Listas: botón «Abrir».  - Ya abiertas: van al historial (reloj).
 */
export default function Bottle({ size, data, update }) {
  const today = todayISO()
  const all = [...(data.bottles ?? [])].sort((a, b) => a.openDate.localeCompare(b.openDate))
  const ready = all.filter((b) => b.openDate <= today && !b.openedAt)
  const sealed = all.filter((b) => b.openDate > today)
  const opened = all.filter((b) => b.openedAt).reverse()
  const [text, setText] = useState('')
  const [date, setDate] = useState(addDays(today, 30))
  const [reading, setReading] = useState(null)

  const seal = (e) => {
    e.preventDefault()
    if (!text.trim() || date <= today) return
    update((d) => ({ ...d, bottles: [...(d.bottles ?? []), { id: crypto.randomUUID(), text: text.trim(), openDate: date, createdAt: today }] }))
    setText('')
  }
  const open = (b) => {
    setReading(b)
    update((d) => ({ ...d, bottles: d.bottles.map((x) => (x.id === b.id ? { ...x, openedAt: today } : x)) }))
  }

  const history = <History title="Cápsulas abiertas" empty="Aún no has abierto ninguna" items={opened.map((b) => ({ id: b.id, date: formatShort(b.openedAt), text: b.text }))} />
  const popup = reading && createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Cápsula abierta">
      <div className="popup-backdrop" onClick={() => setReading(null)} />
      <div className="popup-panel capsule-open">
        <header className="area-head"><h2>Escrita el {formatLong(reading.createdAt)}</h2><button className="icon-btn" onClick={() => setReading(null)} aria-label="Cerrar"><Icon name="close" /></button></header>
        <p className="w-text capsule-text">{reading.text}</p>
      </div>
    </div>,
    document.body
  )

  if (size === 'S') {
    return (
      <div className="w-center">
        {history}{popup}
        <Jar ready={ready.length > 0} />
        {ready.length > 0
          ? <button className="pill pill-pink" onClick={() => open(ready[0])}>Abrir</button>
          : <span className="w-hint">{sealed[0] ? `faltan ${daysUntil(sealed[0].openDate)} d` : 'Ninguna'}</span>}
      </div>
    )
  }

  const list = (
    <ul className="capsules">
      {[...ready, ...sealed].slice(0, size === 'M' ? 2 : 20).map((b) => {
        const isReady = b.openDate <= today
        return (
          <li key={b.id}>
            <Jar ready={isReady} />
            <div>
              <b>{isReady ? `Se puede abrir desde el ${formatLong(b.openDate)}` : `Se abre el ${formatLong(b.openDate)} · faltan ${daysUntil(b.openDate)} días`}</b>
              <span className="w-hint">Escrita el {formatLong(b.createdAt)}</span>
              {isReady && <button className="pill pill-pink pill-sm" onClick={() => open(b)}>Abrir</button>}
            </div>
          </li>
        )
      })}
      {ready.length + sealed.length === 0 && <li className="w-hint">Ninguna cápsula sellada</li>}
    </ul>
  )

  if (size === 'M' || size === 'T') return <>{history}{popup}{list}</>
  return (
    <>
      {history}{popup}
      <form className="w-form w-form-col" onSubmit={seal}>
        <textarea placeholder="Escribe a tu yo del futuro, elige una fecha y la cápsula queda cerrada hasta ese día." value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={3} />
        <div className="w-form">
          <input type="date" value={date} min={addDays(today, 1)} onChange={(e) => setDate(e.target.value)} style={{ flex: 'none' }} />
          <button className="pill pill-pink" disabled={!text.trim()}>Sellar</button>
        </div>
      </form>
      {list}
    </>
  )
}
