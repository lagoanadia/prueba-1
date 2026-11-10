import AddPopup from '../AddPopup.jsx'
import { useState } from 'react'
import MonthGrid, { EMPTY, OneWeek, TwoWeeks } from '../MonthGrid.jsx'
import YearGrid, { YearMass } from '../YearGrid.jsx'
import Icon from '../../components/Icon.jsx'
import Chips from '../Chips.jsx'
import { lastDays, streak, todayISO } from '../../lib/dates.js'

const COLORS = ['#3185FC', '#EFABFF', '#F9DC5C', '#3DDC97', '#E84855']
const RANGES = [{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }, { id: 'año', label: 'Año' }]

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
  const [yearView, setYearView] = useState('masa') // el año entero en bloque, o por meses
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false) // lápiz de la esquina: enseña la ✕ de cada hábito
  const [name, setName] = useState('')
  const habit = habits.find((h) => h.id === current) ?? habits[0]

  const toggle = (day) => update((d) => {
    const days = d.pixels?.[habit.id] ?? []
    return { ...d, pixels: { ...d.pixels, [habit.id]: days.includes(day) ? days.filter((x) => x !== day) : [...days, day] } }
  })
  const removeHabit = (h) => {
    if (!window.confirm(`¿Borrar «${h.name}»? Se borran también sus días marcados.`)) return
    update((d) => { const px = { ...(d.pixels ?? {}) }; delete px[h.id]; return { ...d, habits: (d.habits ?? []).filter((x) => x.id !== h.id), pixels: px } })
    setCurrent(null)
  }
  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, habits: [...(d.habits ?? []), { id, name: name.trim(), color: COLORS[habits.length % COLORS.length] }] }))
    setCurrent(id)
    setName('')
    setAdding(false)
  }

  const addBtn = size !== 'L' && (
    <AddPopup label="Nuevo hábito">{(close) => (
      <form className="w-form" onSubmit={(e) => { add(e); close() }}>
        <input autoFocus placeholder="Leer, meditar…" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        <button className="pill pill-on" disabled={!name.trim()}>Añadir</button>
      </form>
    )}</AddPopup>
  )
  const addForm = adding
    ? <form className="w-form" onSubmit={add}><input autoFocus placeholder="Nuevo hábito" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !name && setAdding(false)} maxLength={30} /></form>
    : null
  const pencil = size !== 'S' && habits.length > 0 && (
    <button className={`w-corner ${editing ? 'on' : ''}`} onClick={() => setEditing(!editing)} aria-label={editing ? 'Terminar de editar' : 'Editar hábitos'} title={editing ? 'Listo' : 'Editar hábitos'}><Icon name={editing ? 'check' : 'pen'} size={15} /></button>
  )
  const tabs = (
    <div className="w-row">
      <div className="chips chips-sm">
        {habits.map((h) => (
          <span key={h.id} className={`chip chip-habit ${habit?.id === h.id ? 'chip-on' : ''}`}>
            <button onClick={() => setCurrent(h.id)}>{h.name}</button>
            {editing && <button className="chip-x" onClick={() => removeHabit(h)} aria-label={`Borrar ${h.name}`}><Icon name="close" size={10} strokeWidth={3.2} color="#B3261E" /></button>}
          </span>
        ))}
        {size === 'L' && <button className="chip" onClick={() => setAdding(true)} aria-label="Añadir hábito">+</button>}
      </div>
    </div>
  )

  if (!habit) {
    return size === 'L'
      ? <>{addForm ?? <button className="pill pill-soft" onClick={() => setAdding(true)}>Añadir hábito</button>}</>
      : <>{addBtn}<p className="w-hint w-center">Sin hábitos</p></>
  }

  const days = pixels[habit.id] ?? []
  const color = (d) => (days.includes(d) ? habit.color : EMPTY)

  if (size === 'S') {
    return (
      <>{addBtn}<button className="w-center px-s-btn" onClick={() => toggle(today)} aria-label={`Marcar hoy: ${habit.name}`} title="Toca para marcar hoy">
        <span className="w-hint">{habit.name}</span>
        <b className="big" style={{ color: days.includes(today) ? habit.color : undefined }}>{streak(days, today)}<small> d</small></b>
        <div className="px-row px-row-sm">{lastDays(7).map((d) => <span key={d} className="px" style={{ background: color(d) }} />)}</div>
      </button></>
    )
  }
  return (
    <>
      {pencil}{addBtn}
      {tabs}
      {addForm}
      {size === 'T' ? (
        <div className="fill slide-in" key={habit.id}><MonthGrid colorFor={color} onDay={toggle} /></div>
      ) : size === 'M' ? (
        <div className="fill slide-in" key={habit.id}><TwoWeeks colorFor={color} onDay={toggle} /></div>
      ) : (
        <>
          <div className="mood-bar">
            <Chips options={RANGES} value={range} onChange={setRange} small />
            {range === 'año' && (
              <>
                <button className={`mood-view ${yearView === 'meses' ? 'on' : ''}`} onClick={() => setYearView('meses')} aria-label="Año por meses" title="Por meses"><Icon name="table" size={15} /></button>
                <button className={`mood-view ${yearView === 'masa' ? 'on' : ''}`} onClick={() => setYearView('masa')} aria-label="Año en bloque" title="En bloque"><Icon name="tree" size={15} /></button>
              </>
            )}
          </div>
          <div className="slide-in fill" key={habit.id + range + yearView}>
            {range === 'semana' && <OneWeek colorFor={color} onDay={toggle} />}
            {range === 'mes' && <MonthGrid colorFor={color} onDay={toggle} />}
            {range === 'año' && (yearView === 'masa' ? <YearMass colorFor={color} onDay={toggle} /> : <YearGrid colorFor={color} onDay={toggle} />)}
          </div>
        </>
      )}
    </>
  )
}
