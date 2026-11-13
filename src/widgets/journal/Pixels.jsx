import AddPopup from '../AddPopup.jsx'
import { useEffect, useRef, useState } from 'react'
import MonthGrid, { EMPTY, OneWeek, TwoWeeks } from '../MonthGrid.jsx'
import YearGrid, { YearMass } from '../YearGrid.jsx'
import Icon from '../../components/Icon.jsx'
import Chips from '../Chips.jsx'
import { lastDays, streak, todayISO } from '../../lib/dates.js'
import { sinceFromData } from '../since.js'

const COLORS = ['#3185FC', '#EFABFF', '#F9DC5C', '#3DDC97', '#E84855']
const RANGES = [{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }, { id: 'año', label: 'Año' }]

/**
 * Pixels de hábitos: UN widget con todos los hábitos. Se cambia de hábito con los chips
 * (Leer, Meditar, Escribir...). Tocar un día lo marca / desmarca.
 * S: racha + semana · T: chips + mes · M: chips + 2 semanas · L: chips + Mes / Año + añadir hábito.
 */
export default function Pixels({ size, data, update, config, setConfig }) {
  const today = todayISO()
  const habits = data.habits ?? []
  const pixels = data.pixels ?? {}
  const [current, setCurrent] = useState(null)
  const [range, setRange] = useState('año')
  const [yearView, setYearView] = useState('masa') // el año entero en bloque, o por meses
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false) // lápiz de la esquina: enseña la ✕ de cada hábito
  const [name, setName] = useState('')
  // Cada widget recuerda su hábito (así puede haber varios pequeños, uno por hábito)
  const habit = habits.find((h) => h.id === (config?.habit ?? current)) ?? habits[0]
  const pick = (id) => { setCurrent(id); setConfig?.({ habit: id }) }
  const [menu, setMenu] = useState(false)
  const swipeX = useRef(null)
  const since = sinceFromData(data, today)
  useEffect(() => { if (!data.since) update((d) => (d.since ? d : { ...d, since })) }, []) // eslint-disable-line react-hooks/exhaustive-deps -- se guarda el día en que empezaste

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
    pick(id)
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
            <button onClick={() => pick(h.id)}>{h.name}</button>
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
    const idx = habits.findIndex((h) => h.id === habit.id)
    const go = (d) => pick(habits[(idx + d + habits.length) % habits.length].id)
    return (
      <div className="px-s" onPointerDown={(e) => { swipeX.current = e.clientX }} onPointerUp={(e) => { if (swipeX.current == null || habits.length < 2) return; const dx = e.clientX - swipeX.current; swipeX.current = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1) }}>
        {addBtn}
        <button className="px-s-name" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Cambiar de hábito">{habit.name}<Icon name="down" size={12} strokeWidth={2.6} /></button>
        {menu && (
          <div className="px-s-menu" role="menu">
            {habits.map((h) => <button key={h.id} role="menuitem" className={h.id === habit.id ? 'on' : ''} onClick={() => { pick(h.id); setMenu(false) }}>{h.name}{h.id === habit.id && <Icon name="check" size={13} />}</button>)}
            <form className="px-s-new" onSubmit={(e) => { add(e); setMenu(false) }}>
              <Icon name="plus" size={13} />
              <input placeholder="Nuevo hábito" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} aria-label="Nuevo hábito" />
            </form>
          </div>
        )}
        <button className="w-center px-s-btn" onClick={() => toggle(today)} aria-label={`Marcar hoy: ${habit.name}`} title="Toca para marcar hoy">
          <b className="big" style={{ color: days.includes(today) ? habit.color : undefined }}>{streak(days, today)}<small> d</small></b>
          <div className="px-row px-row-sm">{lastDays(7).map((d) => <span key={d} className="px" style={{ background: color(d) }} />)}</div>
        </button>
        {habits.length > 1 && <div className="px-s-dots">{habits.map((h) => <button key={h.id} className={h.id === habit.id ? 'on' : ''} onClick={() => pick(h.id)} aria-label={h.name} />)}</div>}
      </div>
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
            {range === 'año' && (yearView === 'masa' ? <YearMass colorFor={color} onDay={toggle} since={since} /> : <YearGrid colorFor={color} onDay={toggle} since={since} />)}
          </div>
        </>
      )}
    </>
  )
}
