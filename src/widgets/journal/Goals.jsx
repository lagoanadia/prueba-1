import AddPopup from '../AddPopup.jsx'
import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { getLang } from '../../i18n/index.js'

const pct = (g) => Math.min(100, Math.round((g.current / g.target) * 100))
// "Leer 12 libros este año" -> "libros" (la palabra que va después del número)
const unitOf = (name) => name.match(/\d+\s+(\p{L}+)/u)?.[1] ?? ''

/** Metas. S: la primera · T: lista vertical · M: hasta 2 · L: todas, con − / + / Quitar y añadir. */
export default function Goals({ size, data, update }) {
  const goals = (data.goals ?? []).filter((g) => !g.fixed)
  // La antigua meta fija «Usar InBloks» ya no existe: si quedó guardada, se limpia
  useEffect(() => {
    if ((data.goals ?? []).some((g) => g.fixed)) update((d) => ({ ...d, goals: (d.goals ?? []).filter((g) => !g.fixed) }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const move = (id, dir) => update((d) => { const l = [...d.goals]; const i = l.findIndex((g) => g.id === id); const j = i + dir; if (j < 0 || j >= l.length) return d; [l[i], l[j]] = [l[j], l[i]]; return { ...d, goals: l } })
  const change = (id, delta) => update((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) } : g)) }))
  const remove = (id) => update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }))
  const add = (g) => update((d) => ({ ...d, goals: [...(d.goals ?? []), { id: crypto.randomUUID(), current: 0, ...g }] }))
  // Papelera en cada meta (pide confirmación: borrar no se puede deshacer)
  const del = (g) => <button className="mini goal-del" onClick={() => window.confirm(getLang() === 'en' ? `Delete "${g.name}"?` : `¿Borrar «${g.name}»?`) && remove(g.id)} aria-label="Borrar meta" title="Borrar"><Icon name="trash" size={15} color="currentColor" /></button>
  const addBtn = <AddPopup label="Nueva meta">{(close) => <GoalForm onSave={(g) => { add(g); close() }} />}</AddPopup>

  // S: la primera meta; tocar el anillo suma uno
  if (size === 'S') {
    const g = goals[0]
    if (!g) return <>{addBtn}<p className="w-hint w-center">Sin metas</p></>
    return (
      <div className="w-center">
        {addBtn}
        <button className="ring ring-btn" style={{ '--p': pct(g) }} onClick={() => change(g.id, 1)} aria-label={`Sumar uno a ${g.name}`}><b>{pct(g)}%</b></button>
        <span className="w-hint w-ellipsis">{g.name} · {g.current}/{g.target}</span>
      </div>
    )
  }

  return (
    <>
      <ul className="goals">
        {goals.map((g, i) => (
          <li key={g.id}>
            <div className="goal-top"><span className="w-ellipsis">{g.name}</span><b>{pct(g)} %</b></div>
            <div className="bar"><span style={{ width: `${pct(g)}%` }} /></div>
            <div className="goal-ctrl">
              <span className="w-hint">{g.current} de {g.target} {g.unit ?? unitOf(g.name)}</span>
              <button className="mini" onClick={() => change(g.id, -1)} aria-label="Menos">−</button>
              <button className="mini" onClick={() => change(g.id, 1)} aria-label="Más">+</button>
              {size === 'L' && goals.length > 1 && <>
                <button className="mini" onClick={() => move(g.id, -1)} disabled={i === 0} aria-label="Subir"><span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="down" size={12} /></span></button>
              </>}
              {del(g)}
            </div>
          </li>
        ))}
      </ul>
      {addBtn}
    </>
  )
}

// Ejemplos que rellenan el formulario de un toque
const EXAMPLES = [['Leer', 12, 'libros'], ['Correr', 100, 'km'], ['Ir al gimnasio', 50, 'veces'], ['Ahorrar', 500, '€'], ['Aprender palabras', 300, 'palabras']]

/** Formulario de meta: qué quieres conseguir, cuánto (con − y +) y en qué se cuenta, con vista previa. */
function GoalForm({ onSave }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState(10)
  const [unit, setUnit] = useState('')
  const step = target >= 100 ? 10 : 1
  const ok = name.trim() && target > 0
  const save = (e) => { e.preventDefault(); if (ok) onSave({ name: name.trim(), target, unit: unit.trim() }) }
  return (
    <form className="goal-form" onSubmit={save}>
      <label className="gf-field"><span>¿Qué quieres conseguir?</span>
        <input autoFocus placeholder="Leer, correr, ahorrar…" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>
      <div className="gf-row">
        <div className="gf-field"><span>¿Cuánto?</span>
          <div className="gf-step">
            <button type="button" className="mini" onClick={() => setTarget(Math.max(1, target - step))} aria-label="Menos">−</button>
            <input type="number" min="1" value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))} aria-label="Objetivo" />
            <button type="button" className="mini" onClick={() => setTarget(target + step)} aria-label="Más">+</button>
          </div>
        </div>
        <label className="gf-field"><span>¿De qué?</span>
          <input placeholder="libros, km, veces…" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={15} />
        </label>
      </div>
      <div className="gf-examples">
        <span className="w-hint">Ideas</span>
        {EXAMPLES.map(([n, t, u]) => <button type="button" key={n} className="chip" onClick={() => { setName(n); setTarget(t); setUnit(u) }}>{n} · {t} {u}</button>)}
      </div>
      <div className="gf-preview" aria-hidden={!ok}>
        <div className="goal-top"><b className="w-ellipsis">{name.trim() || 'Tu meta'}</b><b>0 %</b></div>
        <div className="bar"><span style={{ width: '4%' }} /></div>
        <span className="w-hint">0 de {target} {unit}</span>
      </div>
      <button className="pill pill-on gf-save" disabled={!ok}>Crear meta</button>
    </form>
  )
}
