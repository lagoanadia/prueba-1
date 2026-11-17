import ShareButton from '../../components/ShareButton.jsx'
import { useEffect, useState } from 'react'
import History from '../../components/History.jsx'
import { formatShort, lastDays, todayISO, weekDays } from '../../lib/dates.js'

/**
 * Una cosa buena del día.
 * - Si aún no has escrito nada hoy: campo para escribir.
 * - Al guardar: vista de lectura (el texto bonito). Tocándolo se vuelve a editar.
 * - Los días anteriores van al historial (reloj).
 */
export default function Good({ size, data, update }) {
  const today = todayISO()
  const good = data.good ?? {}
  const saved = good[today] ?? ''
  const [text, setText] = useState(saved)
  const [editing, setEditing] = useState(!saved)
  const tall = size === 'L' || size === 'T'

  // Si el texto guardado cambia desde fuera (otro widget igual, o los datos llegan más tarde), nos ponemos al día
  useEffect(() => {
    setText(saved)
    setEditing(!saved)
  }, [saved])

  const save = (e) => {
    e.preventDefault()
    const value = text.trim()
    update((d) => ({ ...d, good: { ...d.good, [today]: value } }))
    setEditing(!value) // si lo dejas vacío, sigue en modo escribir
  }
  const edit = () => {
    setText(saved)
    setEditing(true)
  }
  const cancel = () => {
    setText(saved)
    setEditing(false)
  }

  const past = Object.keys(good).filter((d) => d < today && good[d]).sort().reverse()
  const history = <History title="Cosas buenas" empty="Aún no hay días anteriores" items={past.map((d) => ({ id: d, date: formatShort(d), text: good[d] }))} />

  // Esta semana: bolita amarilla en los días en que has escrito algo bueno
  const week = weekDays(today)
  const doneWeek = week.filter((d) => good[d]).length
  const dots = (mini = false) => (
    <div className={`good-week ${mini ? 'mini' : ''}`} aria-label={`Esta semana: ${doneWeek} de 7`}>
      {week.map((d, i) => <span key={d} className={d === today ? 'is-today' : ''}>{!mini && 'LMXJVSD'[i]}<i className={good[d] ? 'on' : ''} /></span>)}
    </div>
  )
  const share = <ShareButton kind="good" title="una cosa buena de hoy" className="pill pill-sm" data={{ text: saved }} />
  const quote = (cls = '') => (
    <button className={`good-read ${cls}`} onClick={edit} aria-label="Editar la cosa buena de hoy" title="Toca para editar">
      <span className="good-quote">{saved}</span>
    </button>
  )

  // Vista de lectura (al tocar el texto se edita). Cada tamaño aprovecha su espacio:
  // S: frase + semana · T: tarjeta alta + semana · M: frase a un lado y «5/7» al otro · L: tarjeta + lo bueno de cada día de la semana
  if (!editing) {
    if (size === 'S') return <div className="gd gd-S">{quote()}{dots()}</div>
    if (size === 'M') {
      return (
        <div className="gd gd-M">
          {history}
          <div className="gd-main">{quote()}<span className="gd-share">{share}</span></div>
          <div className="gd-side"><b className="gd-count">{doneWeek}<small>/7</small></b><span className="gd-lab">Esta semana</span>{dots(true)}</div>
        </div>
      )
    }
    if (size === 'T') {
      return (
        <div className="gd gd-T">
          {history}
          {quote('gd-card')}
          <span className="gd-lab">Esta semana · {doneWeek}/7</span>
          {dots()}
          <span className="gd-share">{share}</span>
        </div>
      )
    }
    return (
      <div className="gd gd-L">
        {history}
        {quote('gd-card')}
        <span className="gd-lab">Días anteriores</span>
        <ul className="gd-days">
          {lastDays(7, today).slice(0, 6).reverse().map((d) => <li key={d}><em>{'DLMXJVS'[new Date(`${d}T12:00:00`).getDay()]} {Number(d.slice(8))}</em><span className={good[d] ? '' : 'muted'}>{good[d] || '—'}</span></li>)}
        </ul>
        <span className="gd-share">{share}</span>
      </div>
    )
  }

  if (size === 'S') {
    return (
      <form className="w-form w-form-col w-grow" onSubmit={save} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) save(e); if (e.key === 'Escape' && saved) cancel() }}>
        <textarea autoFocus={Boolean(saved)} placeholder="¿Algo bueno hoy?" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
      </form>
    )
  }

  return (
    <>
      {history}
      <form className={`w-form good-form ${tall ? 'w-form-col w-grow' : ''}`} onSubmit={save}
        onKeyDown={(e) => { if (e.key === 'Escape' && saved) cancel(); if (e.key === 'Enter' && !e.shiftKey && tall) save(e) }}>
        {tall
          ? <textarea autoFocus={Boolean(saved)} placeholder="¿Qué ha salido bien hoy?" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} rows={4} />
          : <input autoFocus={Boolean(saved)} placeholder="¿Algo bueno hoy?" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />}
        <div className="w-form">
          {saved && <button type="button" className="pill" onClick={cancel}>Cancelar</button>}
          <button className="pill pill-on" disabled={!text.trim() || text.trim() === saved}>Guardar</button>
        </div>
      </form>
    </>
  )
}
