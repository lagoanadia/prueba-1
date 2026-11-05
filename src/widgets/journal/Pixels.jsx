import { useState } from 'react'
import MonthGrid from '../MonthGrid.jsx'
import YearGrid from '../YearGrid.jsx'
import Chips from '../Chips.jsx'
import { lastDays, streak, todayISO } from '../../lib/dates.js'

const COLORS = ['#3185FC', '#EFABFF', '#F9DC5C', '#3DDC97', '#E84855']
const RANGES = [{ id: 'mes', label: 'Mes' }, { id: 'año', label: 'Año' }]

/**
 * Pixels de hábitos: UN widget con todos los hábitos. Se cambia de hábito con los chips
 * (Leer, Meditar, Escribir...). Tocar un día lo marca / desmarca.
 * S: racha + semana · T: chips + mes · M: chips + 2 semanas · L: chips + Mes / Año + añadir hábito.
 */
export default function Pixels({ size, data, update }) {
  const today = todayISO()
  const habits = data.habits ?? []
  const pixels = data.pixels ?? {}
  const [current, setCurrent] = useState(null)
  const [range, setRange] = useState('año')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const habit = habits.find((h) => h.id === current) ?? habits[0]

  const toggle = (day) => update((d) => {
    const days = d.pixels?.[habit.id] ?? []
    return { ...d, pixels: { ...d.pixels, [habit.id]: days.includes(day) ? days.filter((x) => x !== day) : [...days, day] } }
  })
  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, habits: [...(d.habits ?? []), { id, name: name.trim(), color: COLORS[habits.length % COLORS.length] }] }))
    setCurrent(id)
    setName('')
    setAdding(false)
  }

  const addForm = adding
    ? <form className="w-form" onSubmit={add}><input autoFocus placeholder="Nuevo hábito" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !name && setAdding(false)} maxLength={30} /></form>
    : null
  const tabs = (
    <div className="w-row">
      <div className="chips chips-sm">
        {habits.map((h) => (
          <button key={h.id} className={`chip ${habit?.id === h.id ? 'chip-on' : ''}`} onClick={() => setCurrent(h.id)}>{h.name}</button>
        ))}
        {size === 'L' && <button className="chip" onClick={() => setAdding(true)} aria-label="Añadir hábito">+</button>}
      </div>
    </div>
  )

  if (!habit) {
    return size === 'L'
      ? <>{addForm ?? <button className="pill pill-soft" onClick={() => setAdding(true)}>Añadir hábito</button>}</>
      : <p className="w-hint w-center">Sin hábitos</p>
  }

  const days = pixels[habit.id] ?? []
  const color = (d) => (days.includes(d) ? habit.color : '#F1F3F4')

  if (size === 'S') {
    return (
      <div className="w-center">
        <span className="w-hint">{habit.name}</span>
        <b className="big">{streak(days, today)}<small> d</small></b>
        <div className="px-row px-row-sm">{lastDays(7).map((d) => <span key={d} className="px" style={{ background: color(d) }} />)}</div>
      </div>
    )
  }
  return (
    <>
      {tabs}
      {addForm}
      {size === 'T' ? (
        <div className="fill slide-in" key={habit.id}><MonthGrid colorFor={color} onDay={toggle} /></div>
      ) : size === 'M' ? (
        <div className="px-row slide-in" key={habit.id}>
          {lastDays(14).map((d) => <button key={d} className="px" style={{ background: color(d) }} onClick={() => toggle(d)} aria-label={d} />)}
        </div>
      ) : (
        <>
          <Chips options={RANGES} value={range} onChange={setRange} small />
          <div className="slide-in fill" key={habit.id + range}>
            {range === 'mes' ? <MonthGrid colorFor={color} onDay={toggle} /> : <YearGrid colorFor={color} onDay={toggle} />}
          </div>
        </>
      )}
    </>
  )
}
