import { useState } from 'react'
import AddPopup from '../AddPopup.jsx'
import Icon from '../../components/Icon.jsx'
import { todayISO } from '../../lib/dates.js'
import { fromMin, toMin } from './healthUtils.js'

const EVERY = [4, 6, 8, 12, 24]

/** Horas del día en las que toca una pastilla: desde la primera, cada N horas. */
const slotsOf = (p) => { const out = []; for (let m = toMin(p.first); m < 1440; m += p.every * 60) out.push(fromMin(m)); return out }

/** Pastillero: tus medicamentos con sus horas de hoy; tocar una hora la marca como tomada y descuenta la pastilla. */
export default function Pills({ data, update }) {
  const today = todayISO()
  const pills = data.pills ?? []
  const change = (id, fn) => update((d) => ({ ...d, pills: (d.pills ?? []).map((p) => (p.id === id ? fn(p) : p)) }))
  const toggle = (p, t) => change(p.id, (x) => {
    const taken = x.taken?.[today] ?? []
    const was = taken.includes(t)
    return { ...x, left: Math.max(0, (x.left ?? 0) + (was ? 1 : -1)), taken: { ...(x.taken ?? {}), [today]: was ? taken.filter((y) => y !== t) : [...taken, t] } }
  })
  const remove = (p) => { if (window.confirm(`¿Quitar «${p.name}» del pastillero?`)) update((d) => ({ ...d, pills: (d.pills ?? []).filter((x) => x.id !== p.id) })) }
  const add = (p) => update((d) => ({ ...d, pills: [...(d.pills ?? []), { id: crypto.randomUUID(), taken: {}, ...p }] }))

  return (
    <div className="sa-pills">
      <AddPopup label="Nuevo medicamento">{(close) => <PillForm onSave={(p) => { add(p); close() }} />}</AddPopup>
      {pills.length === 0 && <p className="sa-hint">Añade un medicamento con el + y te enseño sus horas de hoy.</p>}
      {pills.map((p) => (
        <div key={p.id} className="sa-pill">
          <div className="sa-row sa-split"><b>{p.name} · cada {p.every} horas{p.withFood ? ', con comida' : ''}</b><button className="sa-x" onClick={() => remove(p)} aria-label={`Quitar ${p.name}`}><Icon name="trash" size={14} color="#B3261E" /></button></div>
          <div className="sa-cards">
            {slotsOf(p).map((t) => {
              const done = (p.taken?.[today] ?? []).includes(t)
              return <button key={t} className={`sa-card sa-slot ${done ? 'is-done' : ''}`} onClick={() => toggle(p, t)} aria-pressed={done} title={done ? 'Tomada' : 'Toca cuando la tomes'}><b>{t}</b><span>{p.name}</span><small>{p.dose}</small></button>
            })}
          </div>
          {p.left != null && <p className="sa-hint">{p.left > 0 ? `Quedan ${p.left} pastillas` : 'No quedan pastillas'}</p>}
        </div>
      ))}
    </div>
  )
}

function PillForm({ onSave }) {
  const [f, setF] = useState({ name: '', dose: '', every: 8, first: '08:00', left: '', withFood: false })
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const ok = f.name.trim()
  return (
    <form className="w-form w-form-col" onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ name: f.name.trim(), dose: f.dose.trim(), every: Number(f.every), first: f.first, withFood: f.withFood, left: f.left === '' ? null : Number(f.left) }) }}>
      <input autoFocus placeholder="Medicamento" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={30} />
      <input placeholder="Dosis (400 mg)" value={f.dose} onChange={(e) => set('dose', e.target.value)} maxLength={20} />
      <div className="w-form"><span className="w-hint">Cada</span><select value={f.every} onChange={(e) => set('every', e.target.value)}>{EVERY.map((h) => <option key={h} value={h}>{h} horas</option>)}</select><span className="w-hint">desde</span><input type="time" value={f.first} onChange={(e) => set('first', e.target.value)} /></div>
      <div className="w-form"><input type="number" min="0" placeholder="Pastillas que quedan" value={f.left} onChange={(e) => set('left', e.target.value)} /><label className="sa-check"><input type="checkbox" checked={f.withFood} onChange={(e) => set('withFood', e.target.checked)} />con comida</label></div>
      <button className="pill pill-on" disabled={!ok}>Añadir</button>
    </form>
  )
}
