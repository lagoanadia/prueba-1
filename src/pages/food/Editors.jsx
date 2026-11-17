import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { classifySpices, suggestIngredients } from '../../services/ingredientsService.js'
import { UNITS, fmtQty, isSpice, stepOf } from './spices.js'

/**
 * Ingredientes y especias: los escribe la persona (Intro añade) y la IA sugiere más (se tocan para añadirlos).
 * Cada chip lleva su cantidad (se toca para cambiarla). Lo que es una especia pasa solo a la zona naranja
 * (lista incorporada y, si no la conoce, la IA); con un toque en el chip se pasa de una zona a la otra.
 * value = { items: [nombre], spices: [nombre], amounts: { nombre: { n, unit } } }
 */
export function IngredientsEditor({ dish, value, onChange }) {
  const { items, spices, amounts } = value
  const [text, setText] = useState('')
  const [ideas, setIdeas] = useState([])
  const [spiceIdeas, setSpiceIdeas] = useState([])
  const [looking, setLooking] = useState(false)
  const [why, setWhy] = useState(null) // por qué no hay ideas (clave, cuota…)
  const [pop, setPop] = useState(null) // nombre del chip con su cantidad abierta
  const ref = useRef(value)
  ref.current = value
  const wrap = useRef(null)
  const key = [...items, ...spices].join('|')

  // Sugerencias de la IA: con pausa para no pedir en cada tecla; si falla, se escribe a mano
  useEffect(() => {
    if (dish.trim().length < 3) { setIdeas([]); setSpiceIdeas([]); setLooking(false); return undefined }
    let alive = true
    setLooking(true)
    const t = setTimeout(() => { suggestIngredients(dish, [...items, ...spices]).then((r) => { if (alive) { setIdeas(r.suggestions); setSpiceIdeas(r.spices); setWhy(r.reason); setLooking(false) } }).catch(() => { if (alive) { setIdeas([]); setSpiceIdeas([]); setWhy('net'); setLooking(false) } }) }, 700)
    return () => { alive = false; clearTimeout(t) }
  }, [dish, key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pop) return undefined
    const away = (e) => { if (!wrap.current?.contains(e.target)) setPop(null) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [pop])

  const has = (x) => [...ref.current.items, ...ref.current.spices].some((i) => i.toLowerCase() === x.toLowerCase())
  const put = (x, asSpice) => { const v = ref.current; onChange(asSpice ? { ...v, spices: [...v.spices, x] } : { ...v, items: [...v.items, x] }) }
  // Añadir: la lista incorporada decide al momento; si no lo conoce, la IA mira si es una especia y lo pasa a su zona
  const add = (raw, hint = null) => {
    const x = raw.trim()
    if (!x || has(x)) return
    const spice = hint ?? isSpice(x)
    put(x, spice)
    if (hint == null && !spice) classifySpices([x]).then((r) => { if (r.some((n) => n.toLowerCase() === x.toLowerCase())) move(x, true) })
  }
  const move = (name, toSpice) => {
    const v = ref.current
    if (toSpice ? !v.items.includes(name) : !v.spices.includes(name)) return
    onChange({ ...v, items: toSpice ? v.items.filter((i) => i !== name) : [...v.items, name], spices: toSpice ? [...v.spices, name] : v.spices.filter((i) => i !== name) })
  }
  const remove = (name) => { const v = ref.current; const am = { ...v.amounts }; delete am[name]; onChange({ items: v.items.filter((i) => i !== name), spices: v.spices.filter((i) => i !== name), amounts: am }); setPop(null) }
  const setQty = (name, q) => { const v = ref.current; const am = { ...v.amounts }; if (q) am[name] = q; else delete am[name]; onChange({ ...v, amounts: am }) }
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); setText('') } // sin <form> propio: ya estamos dentro de uno
    else if (e.key === 'Backspace' && !text && items.length) remove(items[items.length - 1])
  }

  const chip = (name, spice) => {
    const q = amounts[name]
    return (
      <span key={name} className={`fd-chip is-on ing-chip ${spice ? 'is-spice' : ''}`}>
        <button type="button" className="ing-main" onClick={() => setPop(pop === name ? null : name)} aria-expanded={pop === name} aria-label={`Cantidad de ${name}`}>
          {name}{q ? <em>{fmtQty(q)}</em> : <em className="is-empty">+ cantidad</em>}
        </button>
        <button type="button" className="ing-x" onClick={() => remove(name)} aria-label={`Quitar ${name}`}><Icon name="close" size={10} strokeWidth={3.2} /></button>
        {pop === name && <QtyPop name={name} q={q} spice={spice} onQty={(n) => setQty(name, n)} onMove={() => { move(name, !spice); setPop(null) }} onClose={() => setPop(null)} />}
      </span>
    )
  }
  const showIdeas = ideas.filter((x) => !has(x))
  const showSpiceIdeas = spiceIdeas.filter((x) => !has(x))

  return (
    <div className="fd-editor" ref={wrap}>
      <div className="fd-chips">
        {items.map((x) => chip(x, false))}
        <input className="fd-line" placeholder="Escribe un ingrediente o una especia…" value={text} maxLength={40} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-label="Ingrediente" />
      </div>
      {dish.trim().length >= 3 && (looking || (showIdeas.length === 0 && showSpiceIdeas.length === 0)) && <span className="fd-hint fd-ideas-hint">{looking ? 'Buscando ideas para «' + dish.trim() + '»…' : ({ nokey: 'La IA no está configurada en el servidor (falta la clave de Groq): escribe a mano', badkey: 'La clave de Groq no es válida o ha caducado: escribe a mano', quota: 'La IA ha llegado a su límite por ahora: escribe a mano', net: 'No se ha podido contactar con la IA: escribe a mano' })[why] ?? 'Sin ideas ahora: escribe tus ingredientes a mano'}</span>}
      {showIdeas.length > 0 && (
        <div className="fd-chips">
          {showIdeas.map((x) => <button type="button" key={x} className="fd-chip is-dash" onClick={() => add(x, false)}>+ {x}</button>)}
        </div>
      )}
      {(spices.length > 0 || showSpiceIdeas.length > 0) && (
        <div className="fd-spices">
          <span className="fd-spices-t"><SpiceIcon />Especias{showSpiceIdeas.length > 0 ? ' · se tocan para añadir' : ''}</span>
          <div className="fd-chips">
            {spices.map((x) => chip(x, true))}
            {showSpiceIdeas.map((x) => <button type="button" key={x} className="fd-chip is-dash is-spice" onClick={() => add(x, true)}>+ {x}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}

const SpiceIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B86A00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 9h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" fill="#B86A00" fillOpacity=".3" /><path d="M8 5h8v4H8Z" /><path d="M10 12h.01M14 12h.01M12 15h.01" /></svg>

/** Cantidad de un ingrediente: − y + con la unidad que elijas; «pasar a especias» si la IA se ha equivocado. */
function QtyPop({ name, q, spice, onQty, onMove, onClose }) {
  const unit = q?.unit ?? 'ud'
  const n = q?.n ?? 1
  const set = (patch) => onQty({ n, unit, ...patch })
  const stepper = unit !== 'al gusto'
  return (
    <span className="ing-pop" role="dialog" aria-label={`Cantidad de ${name}`} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <b>{name}</b>
      {stepper && (
        <span className="ing-step">
          <button type="button" onClick={() => set({ n: Math.max(stepOf(unit) === 1 ? 1 : stepOf(unit), Math.round((n - stepOf(unit)) * 100) / 100) })} aria-label="Menos">−</button>
          <b>{fmtQty({ n, unit: 'ud' })}</b>
          <button type="button" onClick={() => set({ n: Math.round((n + stepOf(unit)) * 100) / 100 })} aria-label="Más">+</button>
        </span>
      )}
      <span className="ing-units">{UNITS.map((u) => <button type="button" key={u} className={u === unit && q ? 'on' : ''} onClick={() => set({ unit: u, n: ['g', 'ml'].includes(u) && n < 50 ? 100 : u === 'pizca' || u === 'al gusto' ? null : (n ?? 1) })}>{u}</button>)}</span>
      <span className="ing-pop-actions">
        {q && <button type="button" onClick={() => onQty(null)}>Quitar cantidad</button>}
        <button type="button" onClick={onMove}>{spice ? 'Pasar a ingredientes' : 'Pasar a especias'}</button>
      </span>
    </span>
  )
}

/** Pasos numerados: Intro pasa al siguiente, Retroceso en uno vacío lo borra. */
export function StepsEditor({ steps, onChange }) {
  const rows = steps.length ? steps : ['']
  const refs = useRef([])
  const focusNext = useRef(null)
  useEffect(() => { if (focusNext.current != null) { refs.current[focusNext.current]?.focus(); focusNext.current = null } })

  const set = (i, v) => onChange(rows.map((x, j) => (j === i ? v : x)))
  const key = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!rows[i].trim()) return
      onChange([...rows.slice(0, i + 1), '', ...rows.slice(i + 1)])
      focusNext.current = i + 1
    } else if (e.key === 'Backspace' && !rows[i] && rows.length > 1) {
      e.preventDefault()
      onChange(rows.filter((_, j) => j !== i))
      focusNext.current = Math.max(0, i - 1)
    }
  }
  return (
    <ol className="fd-steps">
      {rows.map((x, i) => (
        <li key={i}>
          <b>{i + 1}</b>
          <input ref={(el) => { refs.current[i] = el }} className="fd-line" value={x} maxLength={160} placeholder={i === rows.length - 1 ? 'Escribe el paso y pulsa Intro…' : ''}
            onChange={(e) => set(i, e.target.value)} onKeyDown={(e) => key(e, i)} aria-label={`Paso ${i + 1}`} />
          {(rows.length > 1 || x) && <button type="button" className="fd-step-x" onClick={() => onChange(rows.length > 1 ? rows.filter((_, j) => j !== i) : [])} aria-label={`Borrar el paso ${i + 1}`} title="Borrar paso"><Icon name="close" size={12} strokeWidth={3} /></button>}
        </li>
      ))}
    </ol>
  )
}
