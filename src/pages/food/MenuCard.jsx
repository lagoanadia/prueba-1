import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { addDays, dayShort, todayISO, weekDays, weekStart } from '../../lib/dates.js'
import { MEALS, OUT, dishName, dishesOf, isWith, mealsOf } from '../../widgets/comida/food.js'
import Modal from './Modal.jsx'
import SlotDialog from './SlotDialog.jsx'

const kindOf = (v) => (v === OUT ? 'out' : isWith(v) ? 'with' : 'dish')
const range = (days) => {
  const f = (iso) => new Date(`${iso}T12:00:00`)
  const a = f(days[0]); const b = f(days[6])
  const m = (d) => d.toLocaleDateString('es-ES', { month: 'long' })
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} de ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`
}

/** Menú de la semana: días en columnas (en pantallas estrechas, en filas). Tocar una casilla elige la comida; se pueden soltar recetas encima. */
export default function MenuCard({ data, update }) {
  const today = todayISO()
  const [offset, setOffset] = useState(0)
  const [slot, setSlot] = useState(null) // { day, meal }
  const [over, setOver] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [recover, setRecover] = useState(false) // semanas anteriores para basarse en una
  const days = weekDays(addDays(weekStart(today), offset * 7))
  const dishes = dishesOf(data)
  const meals = mealsOf(data)
  const menu = data.menu ?? {}

  const set = (day, meal, value) => update((d) => ({ ...d, menu: { ...d.menu, [day]: { ...d.menu?.[day], [meal]: value || null } } }))
  const toggleMeal = (m) => update((d) => {
    const cur = mealsOf(d)
    const next = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]
    return { ...d, meals: Object.keys(MEALS).filter((x) => next.includes(x)) }
  })
  // Vaciar la semana: quita las comidas del menú de esos 7 días (las recetas no se borran)
  const clearWeek = () => { update((d) => { const menu = { ...(d.menu ?? {}) }; days.forEach((x) => delete menu[x]); return { ...d, menu } }); setClearing(false) }
  const empty = days.every((x) => !Object.values(menu[x] ?? {}).some(Boolean))
  // Semanas anteriores a la que estás viendo que tienen algo apuntado (las más recientes primero)
  const viewed = days[0]
  const pastWeeks = [...new Set(Object.keys(menu).filter((d) => Object.values(menu[d] ?? {}).some(Boolean)).map((d) => weekStart(d)))].filter((w) => w < viewed).sort().reverse().slice(0, 8)
  const preview = (monday) => weekDays(monday).flatMap((d) => Object.values(menu[d] ?? {})).filter(Boolean).map((v) => dishName(dishes, v)).filter(Boolean).slice(0, 3).join(', ')
  // Copia esa semana a la que estás viendo, solo en las casillas vacías (no pisa lo que ya tienes)
  const useWeek = (monday) => {
    update((d) => {
      const next = { ...(d.menu ?? {}) }
      weekDays(monday).forEach((src, i) => {
        const dst = addDays(viewed, i)
        Object.entries(d.menu?.[src] ?? {}).forEach(([meal, v]) => { if (v && !next[dst]?.[meal]) next[dst] = { ...(next[dst] ?? {}), [meal]: v } })
      })
      return { ...d, menu: next }
    })
    setRecover(false)
  }
  const drop = (e, day, meal) => {
    e.preventDefault(); setOver(null)
    const id = e.dataTransfer.getData('text/dish')
    if (id && dishes.some((x) => x.id === id)) set(day, meal, id)
  }

  return (
    <section className="card fd-card fd-menu" aria-label="Menú de la semana">
      <div className="fd-title"><span className="dot-food" aria-hidden="true" /><b>Planificador de comidas</b><span className="fd-grow" />
        <button className={`fd-ib ${recover ? 'on' : ''}`} onClick={() => setRecover(!recover)} aria-expanded={recover} aria-label="Basarme en una semana anterior" title="Recuperar una semana anterior"><Icon name="restore" size={18} /></button>
      </div>
      {recover && (
        <>
          <span className="sc-back" onClick={() => setRecover(false)} />
          <div className="card fd-recover" role="dialog" aria-label="Semanas anteriores">
            <b>Basarme en otra semana</b><span className="fd-hint">Copia sus comidas a la semana que estás viendo (solo en las casillas vacías).</span>
            {pastWeeks.length === 0 && <p className="fd-hint">Aún no hay semanas anteriores con comidas apuntadas.</p>}
            {pastWeeks.map((w) => (
              <div key={w} className="fd-recover-row"><div><b>{range(weekDays(w))}</b><span>{preview(w)}</span></div><button className="fd-pill" onClick={() => useWeek(w)}>Usar</button></div>
            ))}
          </div>
        </>
      )}
      <div className="fd-menu-head">
        <button className="fd-ib" onClick={() => setOffset(offset - 1)} aria-label="Semana anterior"><Icon name="left" size={16} /></button>
        <b className="fd-range">{range(days)}</b>
        <button className="fd-ib" onClick={() => setOffset(offset + 1)} aria-label="Semana siguiente"><Icon name="right" size={16} /></button>
        <button className="fd-ib fd-clear" onClick={() => setClearing(true)} disabled={empty} aria-label="Vaciar semana" title="Vaciar semana"><Icon name="trash" size={16} color="#B3261E" /></button>
        <span className="fd-grow" />
        {['desayuno', 'media', 'merienda'].map((m) => (
          <button key={m} className={`fd-chip ${meals.includes(m) ? 'is-on' : 'is-dash'}`} onClick={() => toggleMeal(m)} aria-pressed={meals.includes(m)}>{meals.includes(m) ? '−' : '+'} {MEALS[m]}</button>
        ))}
      </div>
      <div className="fd-legend"><span><i style={{ background: '#F9DDFF' }} />Plato</span><span><i style={{ background: '#FDF5CE' }} />Comer fuera</span><span><i style={{ background: '#DDEBFE' }} />Con alguien</span></div>
      <div className="fd-week">
        {days.map((d) => (
          <div key={d} className={`fd-day ${d === today ? 'is-today' : ''}`}>
            <div className="fd-dn">{dayShort(d)} {Number(d.slice(8))}{d === today ? ' · hoy' : ''}</div>
            {meals.map((m) => {
              const v = menu[d]?.[m]
              const label = v ? dishName(dishes, v) : ''
              const key = `${d}:${m}`
              return (
                <button key={m} className={`fd-slot ${v && label ? `k-${kindOf(v)}` : 'is-empty'} ${over === key ? 'is-over' : ''}`}
                  onClick={() => setSlot({ day: d, meal: m })} aria-label={`${MEALS[m]} del ${dayShort(d)} ${Number(d.slice(8))}`}
                  onDragOver={(e) => { e.preventDefault(); setOver(key) }} onDragLeave={() => setOver(null)} onDrop={(e) => drop(e, d, m)}>
                  {v && label ? <><small>{MEALS[m]}</small><span>{label}</span></> : <><small className="fd-slot-m">{MEALS[m]}</small><Icon name="plus" size={16} color="#9AA0A6" /></>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {clearing && (
        <Modal title={`Vaciar la semana ${range(days)}`} icon="trash" onClose={() => setClearing(false)}>
          <p className="fd-hint">Se quitan las comidas del menú. Tus recetas no se borran.</p>
          <div className="fd-row"><button className="fd-pill" onClick={() => setClearing(false)}><Icon name="close" size={14} />Cancelar</button><span className="fd-grow" /><button className="fd-pill is-danger" onClick={clearWeek}><Icon name="trash" size={14} color="#B3261E" />Vaciar</button></div>
        </Modal>
      )}
      {slot && <SlotDialog day={slot.day} meal={slot.meal} data={data} update={update} value={menu[slot.day]?.[slot.meal]} onSet={(v) => set(slot.day, slot.meal, v)} onClose={() => setSlot(null)} />}
    </section>
  )
}
