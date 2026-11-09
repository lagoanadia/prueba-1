import { useEffect, useState } from 'react'
import History from '../../components/History.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'

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

  // Vista de lectura: el texto guardado. Al tocarlo pasa a edición.
  if (!editing) {
    return (
      <>
        {size !== 'S' && history}
        <button className={`good-read good-${size}`} onClick={edit} aria-label="Editar la cosa buena de hoy" title="Toca para editar">
          <span className="good-quote">{saved}</span>
        </button>
      </>
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
      <form className={`w-form ${tall ? 'w-form-col w-grow' : ''}`} onSubmit={save}
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
