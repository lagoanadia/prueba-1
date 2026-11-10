import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { suggestIngredients } from '../../services/ingredientsService.js'

/** Ingredientes: los escribe la persona (Intro añade) y la IA sugiere más (se tocan para añadirlos). */
export function IngredientsEditor({ dish, items, onChange }) {
  const [text, setText] = useState('')
  const [ideas, setIdeas] = useState([])
  const key = items.join('|')

  // Sugerencias de la IA: sin etiqueta, con pausa para no pedir en cada tecla; si falla, se escribe a mano
  useEffect(() => {
    if (!dish.trim()) { setIdeas([]); return undefined }
    let alive = true
    const t = setTimeout(() => { suggestIngredients(dish, items).then((r) => alive && setIdeas(r)).catch(() => alive && setIdeas([])) }, 700)
    return () => { alive = false; clearTimeout(t) }
  }, [dish, key]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = (v) => { const x = v.trim(); if (x && !items.some((i) => i.toLowerCase() === x.toLowerCase())) onChange([...items, x]) }
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); setText('') } // sin <form> propio: ya estamos dentro de uno
    else if (e.key === 'Backspace' && !text && items.length) onChange(items.slice(0, -1))
  }

  return (
    <div className="fd-editor">
      <div className="fd-chips">
        {items.map((x, i) => (
          <span key={x + i} className="fd-chip is-on">{x}<button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Quitar ${x}`}><Icon name="close" size={10} strokeWidth={3.2} /></button></span>
        ))}
        <input className="fd-line" placeholder="Escribe un ingrediente…" value={text} maxLength={40} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-label="Ingrediente" />
      </div>
      {ideas.length > 0 && (
        <div className="fd-chips">
          {ideas.map((x) => <button type="button" key={x} className="fd-chip is-dash" onClick={() => add(x)}>+ {x}</button>)}
        </div>
      )}
    </div>
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
        </li>
      ))}
    </ol>
  )
}
