import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddPopup from '../AddPopup.jsx'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import Select from '../../components/Select.jsx'
import { getFriends, getShared, openShared, sendCapsule } from '../../services/friendsService.js'
import { addDays, daysUntil, formatLong, formatShort, todayISO } from '../../lib/dates.js'

const TINTS = ['#9CC5FF', '#B9F2D6', '#F7C8FF', '#FFE59A', '#FFC4A8']

/** Botella plana de color con el mensaje enrollado dentro. Abierta = la misma botella sin tapón. Lista para abrir = brilla. */
const BottleArt = ({ tint, opened }) => (
  <svg className="bottle-art" viewBox="0 0 40 64" aria-hidden="true">
    {!opened && <><rect x="15" y="1.5" width="10" height="8" rx="2.5" fill="#D9A66C" /><rect x="15" y="6" width="10" height="2" fill="#B98045" opacity=".5" /></>}
    <path d="M16.5 9.5h7v6c0 3 8.5 5 8.5 13v27a7.5 7.5 0 0 1-7.5 7.5h-9A7.5 7.5 0 0 1 8 55.5v-27c0-8 8.5-10 8.5-13Z" fill={tint} />
    <path d="M12.5 30v20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    <g transform="rotate(-10 20 44)">
      <rect x="15.5" y="32" width="9" height="20" rx="3" fill="#FFFFFF" />
      <path d="M18 37h4M18 41h4M18 45h3" stroke="#D5D8DC" strokeWidth="1.3" strokeLinecap="round" />
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
  // Cápsulas que te han mandado tus amigos (vienen del servidor; el texto llega solo cuando ya se pueden abrir)
  const [inbox, setInbox] = useState([])
  const [friends, setFriends] = useState([])
  const [to, setTo] = useState('') // '' = solo para mí
  const [sent, setSent] = useState('')
  useEffect(() => {
    let alive = true
    getShared().then((r) => alive && setInbox(r.items ?? [])).catch(() => {})
    getFriends().then((r) => alive && setFriends(r.friends ?? [])).catch(() => {})
    return () => { alive = false }
  }, [])
  const received = inbox.filter((x) => x.kind === 'capsule').map((x) => ({ ...x, remote: true }))
  const all = [...(data.bottles ?? []), ...received].sort((a, b) => a.openDate.localeCompare(b.openDate))
  const ready = all.filter((b) => b.openDate <= today && !b.openedAt)
  const sealed = all.filter((b) => b.openDate > today)
  const opened = all.filter((b) => b.openedAt).reverse()
  const [text, setText] = useState('')
  const [date, setDate] = useState(addDays(today, 30))
  const [reading, setReading] = useState(null)
  const [selId, setSelId] = useState(null)

  const seal = async (e) => {
    e.preventDefault()
    if (!text.trim() || date <= today) return false
    if (to) {
      try { await sendCapsule(to, text.trim(), date); setSent(`Enviada a @${to}. La podrá abrir el ${formatLong(date)}.`) } catch (err) { setSent(err.message); return false }
    } else {
      update((d) => ({ ...d, bottles: [...(d.bottles ?? []), { id: crypto.randomUUID(), text: text.trim(), openDate: date, createdAt: today }] }))
    }
    setText('')
    return true
  }
  const open = (b) => {
    if (b.remote) {
      openShared(b.id).then((r) => setInbox(r.items ?? [])).catch(() => {})
      setReading(b)
      return
    }
    setReading(b)
    update((d) => ({ ...d, bottles: d.bottles.map((x) => (x.id === b.id ? { ...x, openedAt: today } : x)) }))
  }

  const popup = reading && createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label="Cápsula abierta">
      <div className="popup-backdrop" onClick={() => setReading(null)} />
      <div className="popup-panel capsule-open">
        <header className="area-head"><h2>{reading.from ? `De @${reading.from.username} · ` : ''}Escrita el {formatLong(reading.createdAt)}</h2><button className="icon-btn" onClick={() => setReading(null)} aria-label="Cerrar"><Icon name="close" /></button></header>
        <p className="w-text capsule-text">{reading.text}</p>
      </div>
    </div>,
    document.body
  )

  const writeForm = (close, inline = false) => (
    <form className={`w-form w-form-col ${inline ? 'cap-form' : ''}`} onSubmit={async (e) => { if (await seal(e)) close?.() }}>
      {friends.length > 0 && (
        <div className="w-form capsule-to">
          <span className="w-hint">Para</span>
          <Select value={to} label="Para quién" onChange={setTo}
            options={[{ value: '', label: 'Solo yo (privada)', color: '#EFABFF' }, ...friends.map((f) => ({ value: f.username, label: `@${f.username}`, color: '#9CC5FF' }))]} />
        </div>
      )}
      <textarea autoFocus={!inline} placeholder={to ? `Escribe a @${to}. No podrá leerla hasta la fecha que elijas.` : 'Escribe a tu yo del futuro, elige una fecha y la cápsula queda cerrada hasta ese día.'} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={inline ? undefined : 4} />
      <div className="w-form">
        <input type="date" value={date} min={addDays(today, 1)} onChange={(e) => setDate(e.target.value)} style={{ flex: 'none' }} aria-label="Se abre el" />
        <button className="pill pill-pink" disabled={!text.trim()}>{to ? 'Enviar' : 'Sellar'}</button>
      </div>
    </form>
  )
  const addBtn = <AddPopup label="Nueva cápsula">{writeForm}</AddPopup>
  const sentNote = sent && <p className="w-hint capsule-sent" role="status" onClick={() => setSent('')}>{sent}</p>

  // En la balda están todas: las listas, las cerradas y las ya abiertas (sin tapón)
  const shelf = [...ready, ...sealed, ...opened]
  const stateOf = (b) => (b.openedAt ? 'open' : b.openDate <= today ? 'ready' : 'sealed')
  const tagOf = (b) => ({ open: 'Leída', ready: 'Abrir' }[stateOf(b)] ?? (daysUntil(b.openDate) === 1 ? '1 día' : `${daysUntil(b.openDate)} días`))
  const sel = shelf.find((b) => b.id === selId) ?? shelf[0]
  const remove = (b) => { if (window.confirm('¿Borrar esta cápsula?')) { update((d) => ({ ...d, bottles: (d.bottles ?? []).filter((x) => x.id !== b.id) })); setSelId(null) } }

  const one = (b, big = false) => {
    const st = stateOf(b)
    return (
      <button key={b.id} className={`bottle bottle-${st} ${big ? 'bottle-big' : ''} ${sel?.id === b.id && !big ? 'is-sel' : ''}`}
        onClick={() => (big ? st === 'ready' && open(b) : setSelId(b.id))}
        title={st === 'sealed' ? `Se abre el ${formatLong(b.openDate)}` : st === 'ready' ? 'Lista para abrir' : `Abierta el ${formatLong(b.openedAt)}`}
        aria-label={st === 'ready' ? 'Cápsula lista para abrir' : st === 'open' ? 'Cápsula abierta' : `Cápsula cerrada, faltan ${daysUntil(b.openDate)} días`}>
        <BottleArt tint={tintOf(b)} opened={st === 'open'} />
        {b.from && <span className="bottle-from" title={`De @${b.from.username}`}><Avatar avatar={b.from.avatar} size={22} /></span>}
      </button>
    )
  }

  // S: la próxima botella (o la que ya se puede abrir)
  if (size === 'S') {
    return (
      <div className="w-center">
        {popup}{addBtn}
        {shelf[0] ? one(shelf[0], true) : <span className="w-hint">Sin cápsulas</span>}
      </div>
    )
  }

  const bar = <div className="cap-bar" aria-hidden="true" />
  const row = <div className="cap-row">{shelf.map((b) => one(b))}{shelf.length === 0 && <span className="w-hint shelf-empty">Escribe tu primera cápsula{size === 'L' ? '' : ' con el +'}</span>}</div>
  const tags = <div className="cap-tags">{shelf.map((b) => <span key={b.id} className={`bottle-tag tag-${stateOf(b)}`}>{tagOf(b)}</span>)}</div>

  if (size !== 'L') {
    return <>{popup}{addBtn}{sentNote}<div className="cap-shelf">{row}{bar}{tags}</div></>
  }

  const st = sel ? stateOf(sel) : null
  return (
    <>
      {popup}
      <div className="cap-l">
        <div className="cap-left">
          <div className="cap-shelf">{row}{bar}{tags}</div>
          {sel && (
            <div className="cap-detail">
              <div>
                <b>{st === 'open' ? `Abierta el ${formatLong(sel.openedAt)}` : st === 'ready' ? `Se podía abrir desde el ${formatLong(sel.openDate)}` : `Se abre el ${formatLong(sel.openDate)} · faltan ${daysUntil(sel.openDate)} días`}</b>
                <span>{sel.from ? `De @${sel.from.username} · ` : ''}Escrita el {formatLong(sel.createdAt)}</span>
              </div>
              {st === 'ready' && <button className="pill pill-pink" onClick={() => open(sel)}>Abrir</button>}
              {st === 'open' && <button className="pill pill-sm" onClick={() => setReading(sel)}>Leer</button>}
              {!sel.remote && <button className="icon-btn cap-del" onClick={() => remove(sel)} aria-label="Borrar cápsula" title="Borrar"><Icon name="trash" size={16} color="#B3261E" /></button>}
            </div>
          )}
          {sentNote}
        </div>
        {writeForm(null, true)}
      </div>
    </>
  )
}
