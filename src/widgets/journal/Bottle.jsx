import { useState } from 'react'
import { createPortal } from 'react-dom'
import AddPopup from '../AddPopup.jsx'
import History from '../../components/History.jsx'
import Icon from '../../components/Icon.jsx'
import { addDays, daysUntil, formatLong, formatShort, todayISO } from '../../lib/dates.js'

const TINTS = ['#9CC5FF', '#B9F2D6', '#F7C8FF', '#FFE59A', '#FFC4A8']

/** Botella de cristal con el mensaje enrollado dentro. Lista para abrir = brilla y se mueve. */
const BottleArt = ({ tint, ready }) => (
  <svg className="bottle-art" viewBox="0 0 40 64" aria-hidden="true">
    <rect x="15" y="2" width="10" height="8" rx="2" fill="#C08552" stroke="#202124" strokeWidth="1.6" />
    <path d="M16 10h8v6c0 2 8 5 8 13v26a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V29c0-8 8-11 8-13Z" fill={tint} fillOpacity=".55" stroke="#202124" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 32v18" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity=".8" />
    <g transform="rotate(-12 20 42)">
      <rect x="15" y="30" width="10" height="22" rx="3" fill="#FFF6DC" stroke="#202124" strokeWidth="1.4" />
      <path d="M17.5 35h5M17.5 39h5M17.5 43h4" stroke="#C9B98F" strokeWidth="1.2" strokeLinecap="round" />
      {!ready && <circle cx="20" cy="48" r="2.6" fill="#E84855" stroke="#202124" strokeWidth="1" />}
    </g>
  </svg>
)
const tintOf = (b) => TINTS[[...b.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TINTS.length]

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

  const writeForm = (close) => (
    <form className="w-form w-form-col" onSubmit={(e) => { seal(e); if (text.trim() && date > today) close?.() }}>
      <textarea autoFocus placeholder="Escribe a tu yo del futuro. La botella quedará cerrada hasta la fecha que elijas." value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={4} />
      <div className="w-form">
        <input type="date" value={date} min={addDays(today, 1)} onChange={(e) => setDate(e.target.value)} style={{ flex: 'none' }} aria-label="Se abre el" />
        <button className="pill pill-pink" disabled={!text.trim()}>Sellar</button>
      </div>
    </form>
  )
  const addBtn = <AddPopup label="Nueva cápsula">{writeForm}</AddPopup>
  const shelf = [...ready, ...sealed]
  const one = (b, big = false) => {
    const isReady = b.openDate <= today
    const left = daysUntil(b.openDate)
    return (
      <button key={b.id} className={`bottle ${isReady ? 'is-ready' : ''} ${big ? 'bottle-big' : ''}`} onClick={() => isReady && open(b)} disabled={!isReady}
        title={isReady ? 'Toca para abrir' : `Se abre el ${formatLong(b.openDate)}`} aria-label={isReady ? 'Abrir cápsula' : `Cápsula cerrada, faltan ${left} días`}>
        <BottleArt tint={tintOf(b)} ready={isReady} />
        <span className="bottle-tag">{isReady ? 'Abrir' : left === 1 ? '1 día' : `${left} días`}</span>
      </button>
    )
  }

  // S: la próxima botella (o la que ya se puede abrir)
  if (size === 'S') {
    return (
      <div className="w-center">
        {history}{popup}{addBtn}
        {shelf[0] ? one(shelf[0], true) : <span className="w-hint">Sin cápsulas</span>}
      </div>
    )
  }

  return (
    <>
      {history}{popup}{addBtn}
      <div className={`shelf shelf-${size}`}>
        {shelf.map((b) => one(b))}
        {shelf.length === 0 && <span className="w-hint shelf-empty">Escribe tu primera cápsula con el +</span>}
      </div>
      {size === 'L' && ready.length + sealed.length > 0 && <span className="w-hint">{ready.length ? `${ready.length} lista${ready.length > 1 ? 's' : ''} para abrir · ` : ''}{sealed.length} cerrada{sealed.length === 1 ? '' : 's'}</span>}
    </>
  )
}
