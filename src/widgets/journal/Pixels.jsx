import { useRef, useState } from 'react'
import MonthGrid from '../MonthGrid.jsx'
import { lastDays, streak, todayISO } from '../../lib/dates.js'

const COLORS = ['#3185FC', '#EFABFF', '#F9DC5C', '#3DDC97', '#E84855']

/**
 * Pixels de hábitos: UN widget con todos los hábitos (Leer, Escribir, Meditar...).
 * Se desliza en horizontal entre hábitos (scroll-snap). Tocar un día lo marca / desmarca.
 * S: racha + última semana · M: + 2 semanas · L: mes entero + añadir hábito.
 */
export default function Pixels({ size, data, update }) {
  const today = todayISO()
  const habits = data.habits ?? []
  const pixels = data.pixels ?? {}
  const [page, setPage] = useState(0)
  const [name, setName] = useState('')
  const trackRef = useRef(null)

  const toggle = (id, day) => update((d) => {
    const days = d.pixels?.[id] ?? []
    return { ...d, pixels: { ...d.pixels, [id]: days.includes(day) ? days.filter((x) => x !== day) : [...days, day] } }
  })
  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const color = COLORS[habits.length % COLORS.length]
    update((d) => ({ ...d, habits: [...(d.habits ?? []), { id: crypto.randomUUID(), name: name.trim(), color }] }))
    setName('')
  }
  const goTo = (i) => trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: 'smooth' })

  if (habits.length === 0 && size !== 'L') return <p className="w-hint w-center">Añade un hábito (tamaño grande)</p>

  return (
    <>
      <div className="slides" ref={trackRef} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {habits.map((h) => {
          const days = pixels[h.id] ?? []
          const color = (d) => (days.includes(d) ? h.color : '#F1F3F4')
          return (
            <div key={h.id} className="slide">
              <div className="habit-top">
                <span className="w-ellipsis"><span className="dot" style={{ background: h.color }} /> {h.name}</span>
                <b title="Racha (días seguidos)">{streak(days, today)} d</b>
              </div>
              {size === 'L' ? (
                <MonthGrid colorFor={color} onDay={(d) => toggle(h.id, d)} cell={22} />
              ) : (
                <div className="px-row">
                  {lastDays(size === 'S' ? 7 : 14).map((d) => (
                    <button key={d} className="px" style={{ background: color(d) }} onClick={() => toggle(h.id, d)} aria-label={d} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {habits.length > 1 && (
        <div className="slide-dots">
          {habits.map((h, i) => <button key={h.id} className={page === i ? 'on' : ''} style={{ '--c': h.color }} onClick={() => goTo(i)} aria-label={h.name} />)}
        </div>
      )}
      {size === 'L' && (
        <form className="w-form" onSubmit={add}>
          <input placeholder="Nuevo hábito" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          <button className="mini mini-primary" aria-label="Añadir hábito">+</button>
        </form>
      )}
    </>
  )
}
